import Foundation
import React
import KSPlayer

@objc(KSPlayerViewManager)
class KSPlayerViewManager: RCTViewManager {

    override func view() -> UIView! {
        return KSPlayerRNView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override init() {
        super.init()
        KSOptions.setAudioSession()
    }


    @objc func play(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.play()
        }
    }

    @objc func pause(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.pause()
        }
    }

    @objc func seekTo(_ node: NSNumber, time: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.seek(to: time.doubleValue)
        }
    }
    
    @objc func selectAudioTrack(_ node: NSNumber, trackId: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.selectAudioTrack(trackId.int32Value)
        }
    }

    @objc func selectTextTrack(_ node: NSNumber, trackId: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.selectTextTrack(trackId.int32Value)
        }
    }

    @objc func disableTextTrack(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.disableTextTrack()
        }
    }

    @objc func enterFullscreen(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.enterFullscreen()
        }
    }

    @objc func exitFullscreen(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.exitFullscreen()
        }
    }

    @objc func setBrightness(_ node: NSNumber, value: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.setBrightness(CGFloat(value.floatValue))
        }
    }

    @objc func setVolume(_ node: NSNumber, value: NSNumber) {
        DispatchQueue.main.async {
            guard let view = self.bridge.uiManager.view(forReactTag: node) as? KSPlayerRNView else { return }
            view.setVolume(value.floatValue)
        }
    }
}
