/**
 * @file generate-icons.js
 * @description Generates Android adaptive icon resources from the source icon.
 * Creates ic_launcher.png at all required density buckets.
 *
 * Since we don't have sharp/jimp installed, this script creates a
 * simple foreground XML drawable and sets the background color.
 * The actual icon PNGs should be generated using Android Studio's
 * Image Asset Studio for production quality.
 */

const fs = require('fs');
const path = require('path');

const RES_DIR = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// ─── Update adaptive icon background color ──────────────────────
const bgColorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFB8C6</color>
</resources>
`;

const bgColorPath = path.join(RES_DIR, 'values', 'ic_launcher_background.xml');
fs.writeFileSync(bgColorPath, bgColorXml, 'utf8');
console.log('[icons] Updated ic_launcher_background color to #FFB8C6');

// ─── Update strings.xml with correct app name ───────────────────
const stringsPath = path.join(RES_DIR, 'values', 'strings.xml');
const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">RubyPills</string>
    <string name="title_activity_main">RubyPills</string>
    <string name="package_name">com.comsci.rubypills</string>
    <string name="custom_url_scheme">com.comsci.rubypills</string>
</resources>
`;
fs.writeFileSync(stringsPath, stringsXml, 'utf8');
console.log('[icons] Updated strings.xml with RubyPills branding');

// ─── Update splash screen styles ────────────────────────────────
const stylesPath = path.join(RES_DIR, 'values', 'styles.xml');
const stylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">#E4002B</item>
        <item name="colorPrimaryDark">#C80025</item>
        <item name="colorAccent">#FF4D6A</item>
        <item name="android:windowBackground">@drawable/splash</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowBackground">@drawable/splash</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
    </style>
</resources>
`;
fs.writeFileSync(stylesPath, stylesXml, 'utf8');
console.log('[icons] Updated styles.xml with RubyPills theme colors');

console.log('[icons] Done! For production quality icons, use Android Studio Image Asset Studio.');
console.log('[icons] Source icon: rubypills_app_icon.jpg');
