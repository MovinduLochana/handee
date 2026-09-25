# app

Handee App

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Connecting to the Local Backend

When running the App locally against the `.NET` backend, the API endpoint needs to know whether you are running on an emulator or a physical device.

**1. Running on an Android Emulator (Default)**
By default, the app connects to `10.0.2.2`, which is the emulator's bridge to your PC's localhost:
```bash
flutter run
```

**2. Running on a Physical Device**
If you are testing on a real device, you must pass the `DEVICE` flag. This switches the backend URL to your PC's actual LAN IP address (e.g. `192.168.1.3`) so the phone can reach it over the network.
Make sure your phone is on the **same Wi-Fi network** as your PC, and then run:
```bash
flutter run --dart-define=DEVICE=true
```

> **Note**: Your backend `launchSettings.json` must be bound to `http://0.0.0.0:xxxx` in order for a physical device to successfully resolve the connection over Wi-Fi.
