$env:JAVA_HOME="C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$sdkmanager = "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat"

# Accept all licenses
Write-Host "Accepting licenses..."
echo y | & $sdkmanager --licenses 2>&1 | Out-Null
echo y | & $sdkmanager --licenses 2>&1 | Out-Null
echo y | & $sdkmanager --licenses 2>&1 | Out-Null
echo y | & $sdkmanager --licenses 2>&1 | Out-Null
echo y | & $sdkmanager --licenses 2>&1 | Out-Null
echo y | & $sdkmanager --licenses 2>&1 | Out-Null
echo y | & $sdkmanager --licenses 2>&1 | Out-Null

# Install required packages
Write-Host "Installing packages..."
& $sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" 2>&1
