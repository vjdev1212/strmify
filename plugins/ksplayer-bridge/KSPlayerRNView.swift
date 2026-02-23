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
            if paused {
                playerView.pause()
            } else {
                playerView.play()
            }
        }
    }

    @objc var muted: Bool = false {
        didSet {
            playerView.playerLayer?.player.isMuted = muted
        }
    }

    @objc var rate: Float = 1.0 {
        didSet {
            playerView.playerLayer?.player.playbackRate = rate
        }
    }

    @objc var resizeMode: String = "cover" {
        didSet {
            applyResizeMode()
        }
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

    private lazy var playerView: IOSVideoPlayerView = {
        let view = IOSVideoPlayerView()
        view.translatesAutoresizingMaskIntoConstraints = false
        // Hide KSPlayer native controls — RN overlay handles UI
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

        // Progress via KSPlayer's time callback
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

        // Use PlayerControllerDelegate for state and end events
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

        KSOptions.isAutoPlay = !paused

        if !httpHeaders.isEmpty {
            options.appendHeader(httpHeaders)
        }

        // Use MEPlayer (FFmpeg engine) for non-native format support
        KSOptions.secondPlayerType = KSMEPlayer.self

        let resource = KSPlayerResource(url: videoURL, options: options)
        playerView.set(resource: resource)

        lastReportedTime = -1
    }

    // MARK: - Helpers

    private func applyResizeMode() {
        guard let player = playerView.playerLayer?.player else { return }
        switch resizeMode {
        case "contain":
            player.contentMode = .scaleAspectFit
        case "stretch":
            player.contentMode = .scaleToFill
        default: // "cover"
            player.contentMode = .scaleAspectFill
        }
    }

    // MARK: - Track Reporting

    private func reportTracksAndLoad() {
        guard let player = playerView.playerLayer?.player else { return }

        let duration = player.duration

        let audioTracks = player.tracks(mediaType: .audio).map { track -> [String: Any] in
            return [
                "index": Int(track.trackID),
                "title": track.name,
                "language": track.language ?? "",
                "selected": track.isEnabled
            ]
        }

        let textTracks = player.tracks(mediaType: .subtitle).map { track -> [String: Any] in
            return [
                "index": Int(track.trackID),
                "title": track.name,
                "language": track.language ?? "",
                "selected": track.isEnabled
            ]
        }

        onLoad?([
            "duration": duration,
            "currentTime": 0,
            "naturalSize": [
                "width": 1920,
                "height": 1080,
                "orientation": "landscape"
            ],
            "audioTracks": audioTracks,
            "textTracks": textTracks
        ])

        if !audioTracks.isEmpty {
            onAudioTracks?(["audioTracks": audioTracks])
        }
        if !textTracks.isEmpty {
            onTextTracks?(["textTracks": textTracks])
        }
    }

    // MARK: - Commands

    func play() {
        playerView.play()
    }

    func pause() {
        playerView.pause()
    }

    func seek(to time: Double) {
        playerView.seek(time: time) { [weak self] _ in
            _ = self
        }
    }

    func selectAudioTrack(_ trackId: Int32) {
        guard let player = playerView.playerLayer?.player else { return }
        let tracks = player.tracks(mediaType: .audio)
        if let track = tracks.first(where: { $0.trackID == trackId }) {
            player.select(track: track)
        }
    }

    func selectTextTrack(_ trackId: Int32) {
        guard let player = playerView.playerLayer?.player else { return }
        let tracks = player.tracks(mediaType: .subtitle)
        if let track = tracks.first(where: { $0.trackID == trackId }) {
            player.select(track: track)
        }
    }

    func disableTextTrack() {
        guard let player = playerView.playerLayer?.player else { return }
        let tracks = player.tracks(mediaType: .subtitle)
        tracks.forEach { $0.isEnabled = false }
    }

    func enterFullscreen() {
        playerView.updateUI(isLandscape: true)
    }

    func exitFullscreen() {
        playerView.updateUI(isLandscape: false)
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
            onError?([
                "error": [
                    "message": "KSPlayer playback error",
                    "code": -1
                ]
            ])
        case .playedToTheEnd:
            onEnd?([:])
        default:
            break
        }
    }

    func playerController(currentTime: TimeInterval, totalTime: TimeInterval) {
        // Time progress is handled via playTimeDidChange closure above
    }

    func playerController(finish error: Error?) {
        if let error = error {
            onError?([
                "error": [
                    "message": error.localizedDescription,
                    "code": -1
                ]
            ])
        }
    }

    func playerController(maskShow: Bool) {}

    func playerController(action: PlayerButtonType) {}

    func playerController(bufferedCount: Int, consumeTime: TimeInterval) {}

    func playerController(seek: TimeInterval) {}
}