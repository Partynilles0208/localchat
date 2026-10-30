# CLEAN SLATE // Android APK Build Script
$ErrorActionPreference = "Stop"

$SdkBuildTools = "C:\Users\andreas\AppData\Local\Android\Sdk\build-tools\36.0.0"
$AndroidJar = "C:\Users\andreas\AppData\Local\Android\Sdk\platforms\android-37.0\android.jar"
$JavaBin = "C:\Program Files\Java\jdk-27\bin"

$aapt2 = Join-Path $SdkBuildTools "aapt2.exe"
$d8 = Join-Path $SdkBuildTools "d8.bat"
$zipalign = Join-Path $SdkBuildTools "zipalign.exe"
$apksigner = Join-Path $SdkBuildTools "apksigner.bat"

$javac = Join-Path $JavaBin "javac.exe"
$jar = Join-Path $JavaBin "jar.exe"
$keytool = Join-Path $JavaBin "keytool.exe"

Write-Host "==> Aktualisiere Web-Assets im Android-Projekt..." -ForegroundColor Cyan
Copy-Item index.html, styles.css, app.js, config.js -Destination android_build\assets\ -Force

Push-Location android_build
try {
    Write-Host "==> AAPT2 Kompilierung..." -ForegroundColor Cyan
    & $aapt2 compile --dir res -o compiled_res.zip
    & $aapt2 link -I $AndroidJar --manifest AndroidManifest.xml -A assets compiled_res.zip -o base.apk --java gen

    Write-Host "==> Java Kompilierung (Release 17)..." -ForegroundColor Cyan
    if (Test-Path obj) { Remove-Item -Recurse -Force obj }
    New-Item -ItemType Directory -Force -Path obj | Out-Null
    & $javac --release 17 -cp $AndroidJar -d obj gen\com\clean_slate\localchat\R.java src\com\clean_slate\localchat\MainActivity.java

    Write-Host "==> D8 Dexing..." -ForegroundColor Cyan
    $classFiles = Get-ChildItem -Path obj -Recurse -Filter "*.class" | ForEach-Object { $_.FullName }
    & $d8 --lib $AndroidJar --output . $classFiles

    Write-Host "==> Füge classes.dex zu base.apk hinzu..." -ForegroundColor Cyan
    & $jar -uf base.apk classes.dex

    Write-Host "==> Zipalign..." -ForegroundColor Cyan
    if (Test-Path aligned.apk) { Remove-Item -Force aligned.apk }
    & $zipalign -p -f 4 base.apk aligned.apk

    Write-Host "==> Signiere APK mit apksigner..." -ForegroundColor Cyan
    if (!(Test-Path debug.keystore)) {
        & $keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=CleanSlate, O=CleanSlate, C=DE"
    }

    $outApk = Join-Path $PSScriptRoot "localchat.apk"
    & $apksigner sign --ks debug.keystore --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out $outApk aligned.apk

    Write-Host "[OK] localchat.apk erfolgreich erstellt und signiert!" -ForegroundColor Green
} finally {
    Pop-Location
}
