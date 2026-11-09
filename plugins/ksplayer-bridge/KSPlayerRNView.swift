import UIKit
import AVKit
import MediaPlayer
import React
import KSPlayer

@objc(KSPlayerRNView)
class KSPlayerRNView: UIView {

    @objc var url: String = "" {
        didSet {
            guard !url.isEmpty else { return }
            loadVideo()
        }
    }

    @objc var title: String = "" {
        didSet { updateNowPlayingInfo() }
    }

    @objc var subtitle: String = "" {
        didSet { updateNowPlayingInfo() }
    }

    @objc var artworkUri: String = "" {
        didSet { loadNowPlayingArtwork() }
    }

    @objc var headers: NSDictionary = [:] {
        didSet { loadVideo() }
    }

    @objc var paused: Bool = false {
        didSet {
            nowPlayingIsPaused = paused
            if paused { playerView.pause() } else { playerView.play() }
            updateNowPlayingInfo()
        }
    }

    @objc var muted: Bool = false {
        didSet { playerView.playerLayer?.player.isMuted = muted }
    }

    @objc var rate: Float = 1.0 {
        didSet { playerView.playerLayer?.player.playbackRate = rate }
    }

    @objc var resizeMode: String = "cover" {
        didSet { applyResizeMode() }
    }

    @objc var pictureInPictureEnabled: Bool = true {
        didSet { configurePictureInPicture() }
    }

    @objc var onLoad: RCTDirectEventBlock?
    @objc var onProgress: RCTDirectEventBlock?
    @objc var onEnd: RCTDirectEventBlock?
    @objc var onRemotePlay: RCTDirectEventBlock?
    @objc var onRemotePause: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?
    @objc var onBuffer: RCTDirectEventBlock?
    @objc var onReadyForDisplay: RCTDirectEventBlock?
    @objc var onAudioTracks: RCTDirectEventBlock?
    @objc var onTextTracks: RCTDirectEventBlock?
    @objc var onSubtitleText: RCTDirectEventBlock?

    private var hasSetup = false
    private var lastReportedTime: Double = -1
    private var lastSubtitleText: String = ""
    private var artworkRequest: URLSessionDataTask?
    private var loadedArtworkUri: String?
    private var nowPlayingArtwork: MPMediaItemArtwork?
    private var remoteCommandTargets: [Any] = []
    private var hasStartedPlayback = false
    private var nowPlayingIsPaused = false

    private lazy var playerView: IOSVideoPlayerView = {
        let view = IOSVideoPlayerView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.toolBar.isHidden = true
        view.navigationBar.isHidden = true
        return view
    }()

    // MARK: - Brightness / Volume

    func setBrightness(_ value: CGFloat) {
        UIScreen.main.brightness = max(0, min(1, value))
    }

    func setVolume(_ value: Float) {
        volumeSlider?.value = max(0, min(1, value))
    }

    private lazy var volumeSlider: UISlider? = {
        let v = MPVolumeView(frame: .zero)
        if let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene }).first,
           let window = scene.windows.first {
            window.addSubview(v)
            v.frame = CGRect(x: -2000, y: -2000, width: 1, height: 1)
        }
        return v.subviews.compactMap { $0 as? UISlider }.first
    }()

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupPlayer()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPlayer()
    }

    deinit {
        artworkRequest?.cancel()
        let commandCenter = MPRemoteCommandCenter.shared()
        for target in remoteCommandTargets {
            for command in commandCenter.commands {
                command.removeTarget(target)
            }
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    // MARK: - Setup

    private func setupPlayer() {
        guard !hasSetup else { return }
        hasSetup = true

        configureRemoteCommands()
        backgroundColor = .black
        addSubview(playerView)

        NSLayoutConstraint.activate([
            playerView.topAnchor.constraint(equalTo: topAnchor),
            playerView.bottomAnchor.constraint(equalTo: bottomAnchor),
            playerView.leadingAnchor.constraint(equalTo: leadingAnchor),
            playerView.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])

        playerView.playTimeDidChange = { [weak self] currentTime, totalTime in
            guard let self = self else { return }

            // Progress event (throttled to 0.25 s)
            if abs(currentTime - self.lastReportedTime) >= 0.25 {
                self.lastReportedTime = currentTime
                self.updateNowPlayingInfo(currentTime: currentTime, duration: totalTime)
                self.onProgress?([
                    "currentTime": currentTime,
                    "duration": totalTime,
                    "playableDuration": totalTime,
                    "seekableDuration": totalTime
                ])
            }

            // Subtitle text: ask srtControl to evaluate the current time,
            // then read whatever part it resolved.
            if self.playerView.srtControl.subtitle(currentTime: currentTime) {
                let text = self.playerView.srtControl.parts.first?.text?.string ?? ""
                if text != self.lastSubtitleText {
                    self.lastSubtitleText = text
                    self.onSubtitleText?(["text": text])
                }
            }
        }

        playerView.delegate = self
    }

    // MARK: - Load

    private func loadVideo() {
        guard !url.isEmpty, let videoURL = URL(string: url) else { return }

        hasStartedPlayback = false
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil

        var httpHeaders: [String: String] = [:]
        headers.forEach { key, value in
            if let k = key as? String, let v = value as? String {
                httpHeaders[k] = v
            }
        }

        let options = KSOptions()
        options.isSecondOpen = true
        options.isAccurateSeek = true
        options.canStartPictureInPictureAutomaticallyFromInline = pictureInPictureEnabled
        // Must be false so KSPlayer doesn't auto-select and render its own
        // subtitle overlay — we render the text in React via onSubtitleText.
        options.autoSelectEmbedSubtitle = false

        KSOptions.audioPlayerType = AudioRendererPlayer.self
        KSOptions.isAutoPlay = !paused
        KSOptions.secondPlayerType = KSMEPlayer.self

        if !httpHeaders.isEmpty { options.appendHeader(httpHeaders) }

        let resource = KSPlayerResource(url: videoURL, options: options)
        playerView.set(resource: resource)

        lastReportedTime = -1
        lastSubtitleText = ""
    }

    // MARK: - Resize

    private func applyResizeMode() {
        guard let player = playerView.playerLayer?.player else { return }
        switch resizeMode {
        case "contain": player.contentMode = .scaleAspectFit
        case "stretch": player.contentMode = .scaleToFill
        default:        player.contentMode = .scaleAspectFill
        }
    }

    private func configurePictureInPicture() {
        guard #available(iOS 14.2, *),
              let controller = playerView.playerLayer?.player.pipController else {
            return
        }
        controller.canStartPictureInPictureAutomaticallyFromInline = pictureInPictureEnabled
    }

    private func configureRemoteCommands() {
        let commandCenter = MPRemoteCommandCenter.shared()
        remoteCommandTargets = [
            commandCenter.playCommand.addTarget { [weak self] _ in
                self?.play()
                self?.onRemotePlay?([:])
                return .success
            },
            commandCenter.pauseCommand.addTarget { [weak self] _ in
                self?.pause()
                self?.onRemotePause?([:])
                return .success
            },
            commandCenter.togglePlayPauseCommand.addTarget { [weak self] _ in
                guard let self else { return .commandFailed }
                if self.nowPlayingIsPaused {
                    self.play()
                    self.onRemotePlay?([:])
                } else {
                    self.pause()
                    self.onRemotePause?([:])
                }
                return .success
            },
            commandCenter.skipForwardCommand.addTarget { [weak self] _ in
                guard let self,
                      let player = self.playerView.playerLayer?.player else {
                    return .commandFailed
                }
                self.seek(to: player.currentTime + 10)
                return .success
            },
            commandCenter.skipBackwardCommand.addTarget { [weak self] _ in
                guard let self,
                      let player = self.playerView.playerLayer?.player else {
                    return .commandFailed
                }
                self.seek(to: max(0, player.currentTime - 10))
                return .success
            },
            commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
                guard let self,
                      let positionEvent = event as? MPChangePlaybackPositionCommandEvent else {
                    return .commandFailed
                }
                self.seek(to: positionEvent.positionTime)
                return .success
            },
        ]
    }

    private func loadNowPlayingArtwork() {
        artworkRequest?.cancel()
        nowPlayingArtwork = nil
        loadedArtworkUri = nil

        guard let url = URL(string: artworkUri), url.scheme == "https" || url.scheme == "http" else {
            updateNowPlayingInfo()
            return
        }

        let requestedUri = artworkUri
        artworkRequest = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self, self.artworkUri == requestedUri else { return }
                self.artworkRequest = nil

                guard error == nil,
                      let response = response as? HTTPURLResponse,
                      (200..<300).contains(response.statusCode),
                      let data,
                      let image = UIImage(data: data) else {
                    self.updateNowPlayingInfo()
                    return
                }

                self.loadedArtworkUri = requestedUri
                self.nowPlayingArtwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                self.updateNowPlayingInfo()
            }
        }
        artworkRequest?.resume()
    }

    private func updateNowPlayingInfo(currentTime: Double? = nil, duration: Double? = nil) {
        guard Thread.isMainThread else {
            DispatchQueue.main.async { [weak self] in
                self?.updateNowPlayingInfo(currentTime: currentTime, duration: duration)
            }
            return
        }
        guard hasStartedPlayback else { return }

        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title.isEmpty ? "Strmify" : title,
            MPNowPlayingInfoPropertyPlaybackRate: nowPlayingIsPaused ? 0.0 : Double(rate),
        ]
        if !subtitle.isEmpty {
            info[MPMediaItemPropertyAlbumTitle] = subtitle
        }
        if let currentTime {
            info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        }
        if let duration, duration > 0 {
            info[MPMediaItemPropertyPlaybackDuration] = duration
        }
        if loadedArtworkUri == artworkUri, let nowPlayingArtwork {
            info[MPMediaItemPropertyArtwork] = nowPlayingArtwork
        }

        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        if #available(iOS 13.0, *) {
            MPNowPlayingInfoCenter.default().playbackState = nowPlayingIsPaused ? .paused : .playing
        }
    }

    // MARK: - Track reporting

    // KSPlayer adds embedded subtitles asynchronously (1 s after readyToPlay).
    // We mirror that delay so srtControl.subtitleInfos is already populated
    // when we report tracks to JS.
    private func reportTracksAndLoad() {
        guard let player = playerView.playerLayer?.player else { return }

        let duration    = player.duration
        let audioTracks = player.tracks(mediaType: .audio)

        let audioPayload: [[String: Any]] = audioTracks.enumerated().map { idx, track in
            ["index": idx, "title": track.name, "language": track.language ?? "", "selected": track.isEnabled]
        }

        // Fire onLoad immediately with audio tracks; text tracks follow after
        // the 1-second delay KSPlayer needs to populate them.
        onLoad?([
            "duration": duration,
            "currentTime": 0,
            "naturalSize": ["width": 1920, "height": 1080, "orientation": "landscape"],
            "audioTracks": audioPayload,
            "textTracks": [],
            "brightness": UIScreen.main.brightness,
            "volume": AVAudioSession.sharedInstance().outputVolume
        ])

        if !audioPayload.isEmpty { onAudioTracks?(["audioTracks": audioPayload]) }

        // Wait 1.1 s (matches KSPlayer's own asyncAfter(deadline: .now() + 1))
        // then read the embedded subtitle infos from srtControl.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) { [weak self] in
            guard let self = self else { return }
            let textPayload: [[String: Any]] = self.playerView.srtControl.subtitleInfos
                .enumerated()
                .map { idx, info in
                    ["index": idx, "title": info.name, "language": "", "selected": false]
                }
            if !textPayload.isEmpty {
                self.onTextTracks?(["textTracks": textPayload])
            }
        }
    }

    // MARK: - Imperative commands

    func play() {
        nowPlayingIsPaused = false
        playerView.play()
        updateNowPlayingInfo()
    }

    func pause() {
        nowPlayingIsPaused = true
        playerView.pause()
        updateNowPlayingInfo()
    }

    func seek(to time: Double) {
        playerView.seek(time: time) { [weak self] _ in _ = self }
    }

    func selectAudioTrack(_ jsIndex: Int32) {
        guard let player = playerView.playerLayer?.player else { return }
        let tracks = player.tracks(mediaType: .audio)
        let idx = Int(jsIndex)
        guard idx >= 0, idx < tracks.count else { return }
        tracks.enumerated().forEach { i, track in
            if i == idx {
                func doSelect<T: MediaPlayerTrack>(_ t: T) {
                    player.select(track: t)
                }
                doSelect(track)
            }
        }
    }

    func selectTextTrack(_ jsIndex: Int32) {
        let idx = Int(jsIndex)
        let infos = playerView.srtControl.subtitleInfos
        guard idx >= 0, idx < infos.count else { return }
        lastSubtitleText = ""
        onSubtitleText?(["text": ""])
        playerView.srtControl.selectedSubtitleInfo = infos[idx]
    }

    func disableTextTrack() {
        playerView.srtControl.selectedSubtitleInfo = nil
        lastSubtitleText = ""
        onSubtitleText?(["text": ""])
    }

    func enterFullscreen() { playerView.updateUI(isLandscape: true) }
    func exitFullscreen()  { playerView.updateUI(isLandscape: false) }

    func enterPictureInPicture() {
        guard pictureInPictureEnabled,
              AVPictureInPictureController.isPictureInPictureSupported() else {
            return
        }
        playerView.playerLayer?.isPipActive = true
    }

    func exitPictureInPicture() {
        playerView.playerLayer?.isPipActive = false
    }
}

// MARK: - PlayerControllerDelegate

extension KSPlayerRNView: PlayerControllerDelegate {
    func playerController(state: KSPlayerState) {
        switch state {
        case .readyToPlay:
            DispatchQueue.main.async {
                self.playerView.controllerView.isHidden = true
                self.playerView.maskImageView.isHidden = true
                self.playerView.isUserInteractionEnabled = false
            }
            onBuffer?(["isBuffering": false])
            onReadyForDisplay?([:])
            reportTracksAndLoad()
            playerView.playerLayer?.player.isMuted = muted
            playerView.playerLayer?.player.playbackRate = rate
            applyResizeMode()
            configurePictureInPicture()
            hasStartedPlayback = true
            updateNowPlayingInfo(currentTime: player.currentTime, duration: player.duration)

        case .buffering:
            onBuffer?(["isBuffering": true])

        case .bufferFinished:
            onBuffer?(["isBuffering": false])

        case .error:
            hasStartedPlayback = false
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            onError?(["error": ["message": "KSPlayer playback error", "code": -1]])

        case .playedToTheEnd:
            hasStartedPlayback = false
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            onEnd?([:])

        default:
            break
        }
    }

    func playerController(currentTime: TimeInterval, totalTime: TimeInterval) {}
    func playerController(finish error: Error?) {
        if let e = error {
            onError?(["error": ["message": e.localizedDescription, "code": -1]])
        }
    }
    func playerController(maskShow: Bool) {}
    func playerController(action: PlayerButtonType) {}
    func playerController(bufferedCount: Int, consumeTime: TimeInterval) {}
    func playerController(seek: TimeInterval) {}
}
