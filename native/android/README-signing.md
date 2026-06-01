# Android release signing (local `android/` project)

After `pnpm run cap:add:android`, configure signing **only on your machine** (never commit keystores or passwords).

## 1. Create a keystore

```bash
keytool -genkey -v \
  -keystore neon-nexus-release.keystore \
  -alias neon-nexus \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store the `.keystore` file outside the repo (e.g. `~/secrets/`).

## 2. `android/keystore.properties` (gitignored)

Copy from `keystore.properties.example` in this folder:

```properties
storeFile=/absolute/path/to/neon-nexus-release.keystore
storePassword=***
keyAlias=neon-nexus
keyPassword=***
```

## 3. Apply signing to Gradle

In `android/app/build.gradle`, inside `android { }`:

```gradle
def keystorePropsFile = rootProject.file("keystore.properties")
def keystoreProps = new Properties()
if (keystorePropsFile.exists()) {
    keystoreProps.load(new FileInputStream(keystorePropsFile))
}

signingConfigs {
    release {
        if (keystorePropsFile.exists()) {
            storeFile file(keystoreProps['storeFile'])
            storePassword keystoreProps['storePassword']
            keyAlias keystoreProps['keyAlias']
            keyPassword keystoreProps['keyPassword']
        }
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

## 4. Build the Play Store bundle

```bash
pnpm run ship:android:bundle
# or: cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Upload that AAB to Play Console → Internal testing.
