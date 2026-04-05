# migrate-guides.ps1
# Safe migration: replaces Google Fonts link with shared assets,
# removes the old back-to-dashboard <a> anchor, and removes the .back-to-dashboard CSS block.

$files = @(
    "tiktok-system-design.html",
    "twitter-hld.html",
    "search-platform-hld.html",
    "cassandra-architecture.html",
    "clean-code.html",
    "cloud-services.html",
    "dns-journey.html",
    "ecommerce-hld-interview.html",
    "kafka-rabbitmq-enhanced.html",
    "kafka-rabbitmq.html",
    "kubernetes-architecture.html",
    "lld-interview-prep.html",
    "microservices-flow.html",
    "modern-data-architecture.html",
    "observability-stacks.html",
    "springboot-kafka-rabbitmq.html"
)

$sharedAssets = @'
<link rel="stylesheet" href="shared-guides.css">
<script src="data.js" defer></script>

<script src="shared-guides.js" defer></script>
'@

foreach ($file in $files) {
    $path = Join-Path $PSScriptRoot $file
    if (-not (Test-Path $path)) {
        Write-Host "SKIP (not found): $file"
        continue
    }

    $content = Get-Content $path -Raw -Encoding UTF8

    # 1. Replace Google Fonts link with shared assets (keep everything else intact)
    $content = $content -replace '<link href="https://fonts\.googleapis\.com/[^"]*" rel="stylesheet">', $sharedAssets

    # 2. Remove the back-to-dashboard <a> tag (full anchor line)
    $content = $content -replace '<a href="index\.html" class="back-to-dashboard">.*?</a>\r?\n?', ''

    # 3. Remove the .back-to-dashboard CSS block (the whole rule block)
    $content = $content -replace '  \.back-to-dashboard \{[^}]*\}\r?\n?', ''
    $content = $content -replace '  \.back-to-dashboard:hover \{[^}]*\}\r?\n?', ''
    $content = $content -replace '  @media \(max-width: 900px\) \{\r?\n    \.back-to-dashboard \{[^}]*\}\r?\n  \}\r?\n?', ''
    # Remove dangling CSS comment line if present
    $content = $content -replace '  /\* BACK BUTTON \*/\r?\n', ''

    Set-Content $path $content -Encoding UTF8 -NoNewline
    Write-Host "OK: $file"
}

Write-Host "`nDone! All files migrated safely."
