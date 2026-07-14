# RubyPills Android Build Guide

## Prerequisites

1. **Java Development Kit (JDK) 17+**
   - Download: https://adoptium.net/temurin/releases/
   - Set `JAVA_HOME` environment variable

2. **Android Studio**
   - Download: https://developer.android.com/studio
   - During install, ensure Android SDK 34 is selected

3. **Android SDK**
   - Set `ANDROID_HOME` to the SDK location
   - Typical path: `C:\Users\<username>\AppData\Local\Android\Sdk`
   - Add to PATH: `%ANDROID_HOME%\platform-tools`

## Build Debug APK

```bash
# 1. Build web assets
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build debug APK via Gradle
cd android
.\gradlew.bat assembleDebug

# 4. Find APK at:
# android\app\build\outputs\apk\debug\app-debug.apk
```

## Build Release APK (Signed)

### Step 1: Generate a Keystore

```bash
keytool -genkey -v -keystore rubypills-release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias rubypills
```

You'll be prompted for:
- Keystore password
- Your name, organization, etc.
- Key password

**⚠️ KEEP THIS KEYSTORE SAFE! You need it for all future updates.**

### Step 2: Create signing config

Create or edit `android/app/build.gradle` and add inside `android { }`:

```gradle
signingConfigs {
    release {
        storeFile file('../../rubypills-release.keystore')
        storePassword 'YOUR_STORE_PASSWORD'
        keyAlias 'rubypills'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### Step 3: Build signed APK

```bash
cd android
.\gradlew.bat assembleRelease

# Output: android\app\build\outputs\apk\release\app-release.apk
```

## Build Android App Bundle (AAB) for Play Store

```bash
cd android
.\gradlew.bat bundleRelease

# Output: android\app\build\outputs\bundle\release\app-release.aab
```

## Generate App Icons (Production Quality)

1. Open the project in Android Studio: `npx cap open android`
2. Right-click `res` folder → **New → Image Asset**
3. Choose the source icon from the project
4. Select **Adaptive and Legacy** icon type
5. Set background color to `#FFB8C6`
6. Generate all densities

## Install on Device

```bash
# Connect Android device with USB debugging enabled
adb install android\app\build\outputs\apk\debug\app-debug.apk

# Or use Capacitor
npx cap run android
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Copy web assets to www/ |
| `npx cap sync android` | Sync web + plugins to Android |
| `npx cap open android` | Open project in Android Studio |
| `npx cap run android` | Build and deploy to connected device |
| `npx cap copy android` | Copy web assets only (no plugin sync) |
