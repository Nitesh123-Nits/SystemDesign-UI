# fix-remaining.ps1
# Fix the 4 remaining files that had a different font link format

$files = @(
    "cassandra-architecture.html",
    "lld-interview-prep.html",
    "kubernetes-architecture.html",
    "observability-stacks.html"
)

$sharedAssets = '<link rel="stylesheet" href="shared-guides.css">
<script src="data.js" defer></script>

<script src="shared-guides.js" defer></script>'

foreach ($file in $files) {
    $path = Join-Path $PSScriptRoot $file
    if (-not (Test-Path $path)) {
        Write-Host "SKIP (not found): $file"
        continue
    }

    $content = Get-Content $path -Raw -Encoding UTF8

    # Match both formats of Google Fonts link (with and without self-closing slash)
    $content = $content -replace '<link href="https://fonts\.googleapis\.com/[^"]*" rel="stylesheet"\s*/?>', $sharedAssets

    # Remove back-to-dashboard anchor
    $content = $content -replace '<a href="index\.html" class="back-to-dashboard">.*?</a>\r?\n?', ''

    # Remove .back-to-dashboard CSS blocks
    $content = $content -replace '  \.back-to-dashboard \{[^}]*\}\r?\n?', ''
    $content = $content -replace '  \.back-to-dashboard:hover \{[^}]*\}\r?\n?', ''
    $content = $content -replace '  @media \(max-width: 900px\) \{\r?\n    \.back-to-dashboard \{[^}]*\}\r?\n  \}\r?\n?', ''
    $content = $content -replace '  /\* BACK BUTTON \*/\r?\n', ''

    Set-Content $path $content -Encoding UTF8 -NoNewline
    Write-Host "OK: $file"
}
Write-Host "Done!"
