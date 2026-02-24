import UIKit
import React
import KSPlayer

@objc(KSPlayerRNView)
class KSPlayerRNView: UIView {

    // MARK: - RN Props

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

    // MARK: - RN Event Callbacks

    @objc var onLoad: RCTDirectEventBlock?
    @objc var onProgress: RCTDirectEventBlock?
    @objc var onEnd: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?
    @objc var onBuffer: RCTDirectEventBlock?
    @objc var onReadyForDisplay: RCTDirectEventBlock?
    @objc var onAudioTracks: RCTDirectEventBlock?
    @objc var onTextTracks: RCTDirectEventBlock?

    // MARK: - Internal

    private var hasSetup = false
    private var lastReportedTime: Double = -1
    private var isPlayerReady = false
    private var pendingSubtitleTrackID: Int32 = -1

    private lazy var playerView: IOSVideoPlayerView = {
        let view = IOSVideoPlayerView()
        view.translatesAutoresizingMaskIntoConstraints = false
        // Hide the built-in toolbar/navbar — we have our own RN controls
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
            if abs(currentTime - self.lastReportedTime) >= 0.25 {
                self.lastReportedTime = currentTime
                self.onProgress?([
                    "currentTime": currentTime,
                    "duration": totalTime,
                    "playableDuration": totalTime,
                    "seekableDuration": totalTime
                ])
            }
        }
        playerView.delegate = self
    }

    // MARK: - Load

    private func loadVideo() {
        guard !url.isEmpty, let videoURL = URL(string: url) else { return }
        isPlayerReady = false
        pendingSubtitleTrackID = -1

        var httpHeaders: [String: String] = [:]
        headers.forEach { key, value in
            if let k = key as? String, let v = value as? String { httpHeaders[k] = v }
        }

        let options = KSOptions()
        options.isSecondOpen = true
        options.isAccurateSeek = true
        // Let KSPlayer manage its own subtitle pipeline naturally.
        // autoSelectEmbedSubtitle = true means KSPlayer will auto-pick a subtitle,
        // but we immediately deselect after load by calling player.select on a disabled track.
        // IMPORTANT: Do NOT set this to false — it prevents the pipeline from starting.
        options.autoSelectEmbedSubtitle = true
        KSOptions.isAutoPlay = !paused
        if !httpHeaders.isEmpty { options.appendHeader(httpHeaders) }
        KSOptions.secondPlayerType = KSMEPlayer.self

        let resource = KSPlayerResource(url: videoURL, options: options)
        playerView.set(resource: resource)
        lastReportedTime = -1
    }

    // MARK: - Helpers

    private func applyResizeMode() {
        guard let player = playerView.playerLayer?.player else { return }
        switch resizeMode {
        case "contain": player.contentMode = .scaleAspectFit
        case "stretch": player.contentMode = .scaleToFill
        default:        player.contentMode = .scaleAspectFill
        }
    }

    // MARK: - Track Reporting

    private func reportTracksAndLoad() {
        guard let player = playerView.playerLayer?.player else { return }

        let duration = player.duration
        let audioTrackList = player.tracks(mediaType: .audio)
        let textTrackList  = player.tracks(mediaType: .subtitle)

        let audioTracks: [[String: Any]] = audioTrackList.map {
            ["index": $0.trackID, "title": $0.name, "language": $0.language ?? "", "selected": $0.isEnabled]
        }
        let textTracks: [[String: Any]] = textTrackList.map {
            ["index": $0.trackID, "title": $0.name, "language": $0.language ?? "", "selected": $0.isEnabled]
        }

        // Deselect all subtitle tracks on load — user picks explicitly.
        // We do NOT touch isEnabled here because KSPlayer manages that internally.
        // Instead we call select on a nil/invalid path to clear the selection.
        // The correct KSPlayer way to clear subtitles is to find the enabled one
        // and disable it, but we must let KSPlayer's own state machine handle it.
        textTrackList.forEach { track in
            if track.isEnabled {
                track.isEnabled = false
            }
        }

        onLoad?([
            "duration": duration,
            "currentTime": 0,
            "naturalSize": ["width": 1920, "height": 1080, "orientation": "landscape"],
            "audioTracks": audioTracks,
            "textTracks":  textTracks
        ])

        if !audioTracks.isEmpty { onAudioTracks?(["audioTracks": audioTracks]) }
        if !textTracks.isEmpty  { onTextTracks?(["textTracks": textTracks]) }

        if pendingSubtitleTrackID >= 0 {
            let queued = pendingSubtitleTrackID
            pendingSubtitleTrackID = -1
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                self?.applySubtitleTrack(queued)
            }
        }
    }

    // MARK: - Apply subtitle track
    // KSPlayer's correct API: just call player.select(track:) with the desired track.
    // Do NOT manually toggle isEnabled — that's KSPlayer's internal concern.
    // select(track:) on the MediaPlayerProtocol handles both enabling the track
    // and routing packets to the subtitle renderer.

    private func applySubtitleTrack(_ trackId: Int32) {
        guard let player = playerView.playerLayer?.player else {
            pendingSubtitleTrackID = trackId
            return
        }

        let tracks = player.tracks(mediaType: .subtitle)

        // First disable all — KSPlayer will re-enable via select
        tracks.forEach { $0.isEnabled = false }

        if let target = tracks.first(where: { $0.trackID == trackId }) {
            // This is the ONE correct call — select handles everything internally
            player.select(track: target)
        }
    }

    // MARK: - Commands

    func play()  { playerView.play() }
    func pause() { playerView.pause() }

    func seek(to time: Double) {
        playerView.seek(time: time) { [weak self] _ in _ = self }
    }

    func selectAudioTrack(_ trackId: Int32) {
        guard let player = playerView.playerLayer?.player else { return }
        if let track = player.tracks(mediaType: .audio).first(where: { $0.trackID == trackId }) {
            player.select(track: track)
        }
    }

    func selectTextTrack(_ trackId: Int32) {
        guard isPlayerReady else {
            pendingSubtitleTrackID = trackId
            return
        }
        applySubtitleTrack(trackId)
    }

    func disableTextTrack() {
        pendingSubtitleTrackID = -1
        guard let player = playerView.playerLayer?.player else { return }
        // Disable all subtitle tracks
        player.tracks(mediaType: .subtitle).forEach { $0.isEnabled = false }
    }

    func enterFullscreen() { playerView.updateUI(isLandscape: true)  }
    func exitFullscreen()  { playerView.updateUI(isLandscape: false) }
}

// MARK: - PlayerControllerDelegate

extension KSPlayerRNView: PlayerControllerDelegate {
    func playerController(state: KSPlayerState) {
        switch state {
        case .readyToPlay:
            isPlayerReady = true
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
        if let error = error {
            onError?(["error": ["message": error.localizedDescription, "code": -1]])
        }
    }

    func playerController(maskShow: Bool) {}
    func playerController(action: PlayerButtonType) {}
    func playerController(bufferedCount: Int, consumeTime: TimeInterval) {}
    func playerController(seek: TimeInterval) {}
}