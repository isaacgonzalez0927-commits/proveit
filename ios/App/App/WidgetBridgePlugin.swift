import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadWidgets", returnType: CAPPluginReturnPromise),
    ]

    @objc func updateSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("payload") else {
            call.reject("Missing payload")
            return
        }
        ProveitWidgetStore.saveSnapshotJSON(json)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc func reloadWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
