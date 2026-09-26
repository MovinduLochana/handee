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
If you are testing on a real device, pass the `DEVICE` flag. By default, it connects to your LAN IP (`192.168.1.2` or overridden via `DEVICE_IP`):
```bash
# Using default local Wi-Fi IP:
flutter run --dart-define=DEVICE=true

# Or explicitly specifying your PC's IP address:
flutter run --dart-define=DEVICE=true --dart-define=DEVICE_IP=192.168.1.2
```

> **Tip**: If connected via USB debugging, you can also run:
> `adb reverse tcp:5057 tcp:5057`
> The script `run-services.ps1` sets this up and automatically detects your LAN IP.
