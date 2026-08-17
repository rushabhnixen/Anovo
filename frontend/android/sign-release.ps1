# Builds the signed release APK and AAB.
#
# Contains no secrets: the upload-key password is read from the DPAPI-encrypted
# credential file at run time, held only in memory, and cleared on exit. Safe to
# commit. Run from anywhere:
#
#   powershell -ExecutionPolicy Bypass -File frontend\android\sign-release.ps1
#
param(
    [string]$KeystoreDir = (Join-Path $HOME 'Documents\Anovo Play Release'),
    [string]$KeystoreName = 'anovo-upload-key.jks',
    [string]$CredentialName = 'anovo-upload-key.credential.clixml'
)

$ErrorActionPreference = 'Stop'
$androidDir = $PSScriptRoot

function Fail($message) { Write-Host "FAILED: $message" -ForegroundColor Red; exit 1 }

# ── Preflight ────────────────────────────────────────────────────────────────
$jks = Join-Path $KeystoreDir $KeystoreName
$clixml = Join-Path $KeystoreDir $CredentialName
if (-not (Test-Path $jks))    { Fail "Keystore not found: $jks" }
if (-not (Test-Path $clixml)) { Fail "Credential file not found: $clixml" }
if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) { Fail 'keytool is not on PATH (needs a JDK).' }

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $sdk)) { Fail "Android SDK not found: $sdk" }
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk

$version = (Select-String -Path (Join-Path $androidDir 'app\build.gradle') -Pattern 'versionName "(.+)"').Matches[0].Groups[1].Value
$code    = (Select-String -Path (Join-Path $androidDir 'app\build.gradle') -Pattern 'versionCode (\d+)').Matches[0].Groups[1].Value
Write-Host "Building Anovo $version (versionCode $code)" -ForegroundColor Cyan

try {
    # ── Credentials: in memory only ──────────────────────────────────────────
    $cred = Import-CliXml $clixml
    $pw = $cred.GetNetworkCredential().Password
    if (-not $pw) { Fail 'The credential file contains no password.' }

    # Resolve the real alias from the keystore rather than guessing.
    $aliasLines = & keytool -list -v -keystore $jks -storepass $pw 2>&1
    if ($LASTEXITCODE -ne 0) { Fail 'keytool could not open the keystore — the stored password may be wrong.' }
    $match = $aliasLines | Select-String '^Alias name: (.+)$'
    if (-not $match) { Fail 'No alias found in the keystore.' }
    $alias = $match.Matches[0].Groups[1].Value.Trim()
    Write-Host "Signing with alias: $alias" -ForegroundColor Cyan

    $env:ANOVO_KEYSTORE_FILE     = $jks
    $env:ANOVO_KEYSTORE_PASSWORD = $pw
    $env:ANOVO_KEY_ALIAS         = $alias
    $env:ANOVO_KEY_PASSWORD      = $pw   # adjust if the key has a separate password

    Push-Location $androidDir
    try {
        & .\gradlew.bat clean assembleRelease bundleRelease --no-daemon
        if ($LASTEXITCODE -ne 0) { Fail 'Gradle build failed.' }
    } finally {
        Pop-Location
    }
}
finally {
    # Never leave the password in the environment.
    Remove-Item Env:ANOVO_KEYSTORE_PASSWORD, Env:ANOVO_KEY_PASSWORD -ErrorAction SilentlyContinue
    if ($pw) { $pw = $null }
    if ($cred) { $cred = $null }
    [System.GC]::Collect()
}

# ── Verify the outputs are actually signed ───────────────────────────────────
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Test-Signed($path) {
    if (-not (Test-Path $path)) { return $null }
    $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
    try {
        return [bool]($zip.Entries | Where-Object { $_.FullName -match '^META-INF/.*\.(RSA|DSA|EC)$' })
    } finally { $zip.Dispose() }
}

$apk = Join-Path $androidDir 'app\build\outputs\apk\release\app-release.apk'
$aab = Join-Path $androidDir 'app\build\outputs\bundle\release\app-release.aab'

Write-Host ''
$ok = $true
foreach ($artifact in @(@{ Path = $apk; Label = 'APK' }, @{ Path = $aab; Label = 'AAB' })) {
    $signed = Test-Signed $artifact.Path
    if ($null -eq $signed) {
        Write-Host "$($artifact.Label): NOT PRODUCED" -ForegroundColor Red; $ok = $false
    } elseif ($signed) {
        $size = [math]::Round((Get-Item $artifact.Path).Length / 1MB, 2)
        Write-Host "$($artifact.Label): signed, $size MB" -ForegroundColor Green
        Write-Host "     $($artifact.Path)"
    } else {
        Write-Host "$($artifact.Label): UNSIGNED — Play will reject this" -ForegroundColor Red; $ok = $false
    }
}

if (-not $ok) { exit 1 }
Write-Host ''
Write-Host "Upload the AAB to Play. Install the APK for QA." -ForegroundColor Cyan
