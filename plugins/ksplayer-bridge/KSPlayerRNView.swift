import UIKit
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

    @objc var headers: NSDictionary = [:] {
        didSet { loadVideo() }
    }

    @objc var paused: Bool = false {
        didSet {
            if paused { playerView.pause() } else { playerView.play() }
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

    @objc var onLoad: RCTDirectEventBlock?
    @objc var onProgress: RCTDirectEventBlock?
    @objc var onEnd: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?
    @objc var onBuffer: RCTDirectEventBlock?
    @objc var onReadyForDisplay: RCTDirectEventBlock?
    @objc var onAudioTracks: RCTDirectEventBlock?
    @objc var onTextTracks: RCTDirectEventBlock?
    @objc var onSubtitleText: RCTDirectEventBlock?

    private var hasSetup = false
    private var lastReportedTime: Double = -1
    private var lastSubtitleText: String = ""

    private lazy var playerView: IOSVideoPlayerView = {
        let view = IOSVideoPlayerView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.toolBar.isHidden = true
        view.navigationBar.isHidden = true
        return view
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

    // MARK: - Setup

    private func setupPlayer() {
        guard !hasSetup else { return }
        hasSetup = true

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

        var httpHeaders: [String: String] = [:]
        headers.forEach { key, value in
            if let k = key as? String, let v = value as? String {
                httpHeaders[k] = v
            }
        }

        let options = KSOptions()
        options.isSecondOpen = true
        options.isAccurateSeek = true
        // Must be false so KSPlayer doesn't auto-select and render its own
        // subtitle overlay — we render the text in React via onSubtitleText.
        options.autoSelectEmbedSubtitle = false
        
        KSOptions.audioPlayerType = AudioRendererPlayer.self
        // ─────────────────────────────────────────────────────────────────────

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

    func play()  { playerView.play() }
    func pause() { playerView.pause() }

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
        // Clear displayed text while switching
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
    
    func setBrightness(_ value: CGFloat) {
        UIScreen.main.brightness = max(0, min(1, value))
    }

    func setVolume(_ value: Float) {
        volumeSlider?.value = max(0, min(1, value))
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

        case .buffering:
            onBuffer?(["isBuffering": true])

        case .bufferFinished:
            onBuffer?(["isBuffering": false])

        case .error:
            onError?(["error": ["message": "KSPlayer playback error", "code": -1]])

        case .playedToTheEnd:
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

private lazy var volumeSlider: UISlider? = {
    let v = MPVolumeView(frame: .zero)
    if let window = UIApplication.shared.windows.first {
        window.addSubview(v)
        v.frame = CGRect(x: -2000, y: -2000, width: 1, height: 1)
    }
    return v.subviews.compactMap { $0 as? UISlider }.first
}()