<#
    update-genspirecli.ps1
    ----------------------
    • Builds GenspireCLI as a .NET tool into ./bin/Release
    • Uninstalls any existing global installation
    • Installs the freshly-built package from the local folder
    • Verifies installation via 'genspire help'
#>

$ErrorActionPreference = 'Stop'

# ----------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------
$PACKAGE_ID = 'GenspireCLI'
$TOOL_CMD   = 'genspire'
$BUILD_DIR  = './bin/Release'

# ----------------------------------------------------------------------
# Move to project root (parent of Scripts)
# ----------------------------------------------------------------------
$projectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $projectRoot

# ----------------------------------------------------------------------
# Find csproj
# ----------------------------------------------------------------------
$csproj = Get-ChildItem *.csproj | Select-Object -First 1
if (-not $csproj) { throw "No .csproj found in $projectRoot" }

# ----------------------------------------------------------------------
# Step 1: Build NuGet package
# ----------------------------------------------------------------------
Write-Host "`nPacking $($csproj.Name) as a tool into $BUILD_DIR …"
dotnet pack $csproj.FullName -c Release -o $BUILD_DIR

# ----------------------------------------------------------------------
# Step 2: Ensure package exists
# ----------------------------------------------------------------------
$pkg = Get-ChildItem "$BUILD_DIR/$PACKAGE_ID*.nupkg" -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime |
       Select-Object -Last 1
if (-not $pkg) {
    throw "$PACKAGE_ID NuGet package not found in $BUILD_DIR. Check your csproj configuration."
}

# ----------------------------------------------------------------------
# Step 3: Uninstall existing global tool (if any)
# ----------------------------------------------------------------------
if (dotnet tool list --global | Select-String -Pattern "^\s*$PACKAGE_ID\s" -Quiet) {
    Write-Host "`nExisting global $PACKAGE_ID detected – uninstalling…"
    dotnet tool uninstall --global $PACKAGE_ID
} else {
    Write-Host "`n$PACKAGE_ID not currently installed – skipping uninstall."
}

# ----------------------------------------------------------------------
# Step 4: Install freshly built package
# ----------------------------------------------------------------------
Write-Host "`nInstalling $PACKAGE_ID from local package …"
dotnet tool install --global $PACKAGE_ID --add-source $BUILD_DIR

# ----------------------------------------------------------------------
# Step 5: Verify
# ----------------------------------------------------------------------
Write-Host "`nVerifying: running '$TOOL_CMD help' …"
& $TOOL_CMD help
