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

## Backend Configuration
 
By default, the app connects directly to the live deployed Azure App Service:
`https://sefproject-g3cmczhth2cygqgh.southeastasia-01.azurewebsites.net`
 
```bash
flutter run
```
 
### Connecting to a Local Backend (Optional)
 
To point the app to your local `.NET` backend instead:
 
**1. Running on an Android Emulator**
```bash
flutter run --dart-define=USE_LOCAL=true
```
This connects to `http://10.0.2.2:5057`.
 
**2. Running on a Physical Device**
```bash
flutter run --dart-define=USE_LOCAL=true --dart-define=DEVICE=true
```
This connects to your LAN IP (`http://192.168.1.3:5057`).
 
**3. Custom API URL**
```bash
flutter run --dart-define=API_URL=https://custom-domain.com
```
