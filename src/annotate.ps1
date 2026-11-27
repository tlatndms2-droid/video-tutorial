param([Parameter(Mandatory = $true)][string]$Spec)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$data = Get-Content -LiteralPath $Spec -Raw -Encoding utf8 | ConvertFrom-Json
$panels = @($data.panels)
$gutter = 16
$heading = if ($panels.Count -gt 1 -or $panels[0].title) { 56 } else { 0 }
$w = if ($panels.Count -gt 1) { 720 } else { 1200 }
$h = 740
$bitmaps = [Collections.Generic.List[System.Drawing.Bitmap]]::new()
foreach ($p in $panels) {
    $bitmaps.Add([System.Drawing.Bitmap]::new($p.image))
}
$previewHeight = 1
foreach ($bitmap in $bitmaps) {
    $previewHeight = [Math]::Max($previewHeight, [int]($bitmap.Height * [Math]::Min($w / $bitmap.Width, $h / $bitmap.Height)))
}
$canvas = [Drawing.Bitmap]::new(($w * $panels.Count + $gutter * ($panels.Count + 1)), ($previewHeight + $heading + 2 * $gutter))
$graphics = [Drawing.Graphics]::FromImage($canvas)
$accent = [Drawing.Color]::FromArgb(255, 187, 58)
$background = [Drawing.Color]::FromArgb(24, 34, 44)
$ink = [Drawing.SolidBrush]::new($accent)
$shadow = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(235, 24, 34, 44))
$pen = [Drawing.Pen]::new($accent, 4)
$arrow = [Drawing.Pen]::new($accent, 4)
$arrow.CustomEndCap = [Drawing.Drawing2D.AdjustableArrowCap]::new(4, 5)
$font = [Drawing.Font]::new('Malgun Gothic', 17, [Drawing.FontStyle]::Bold)
$titleFont = [Drawing.Font]::new('Malgun Gothic', 22, [Drawing.FontStyle]::Bold)
try {
    $graphics.Clear($background)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    for ($i = 0; $i -lt $panels.Count; $i++) {
        $p = $panels[$i]
        $frame = $bitmaps[$i]
        $scale = [Math]::Min($w / $frame.Width, $h / $frame.Height)
        $fw = [int]($frame.Width * $scale)
        $fh = [int]($frame.Height * $scale)
        $left = $gutter + $i * ($w + $gutter)
        $x = $left + [int](($w - $fw) / 2)
        $y = $gutter + $heading + [int](($previewHeight - $fh) / 2)
        $graphics.DrawImage($frame, $x, $y, $fw, $fh)
        if ($p.title) { $graphics.DrawString($p.title, $titleFont, [Drawing.Brushes]::White, $left, $gutter) }
        foreach ($mark in @($p.marks)) {
            $mx = [single]($x + $mark.x * $fw)
            $my = [single]($y + $mark.y * $fh)
            if ($mark.type -eq 'arrow') {
                $graphics.DrawLine($arrow, $mx, $my, [single]($x + $mark.to_x * $fw), [single]($y + $mark.to_y * $fh))
                continue
            }
            $mw = [single]($mark.width * $fw)
            $mh = [single]($mark.height * $fh)
            if ($mark.type -eq 'box') { $graphics.DrawRectangle($pen, $mx, $my, $mw, $mh) }
            if ($mark.type -eq 'circle') { $graphics.DrawEllipse($pen, $mx, $my, $mw, $mh) }
            if ($mark.type -eq 'label') {
                $area = [Drawing.RectangleF]::new($mx, $my, $mw, $mh)
                $graphics.FillRectangle($shadow, $area)
                $textArea = [Drawing.RectangleF]::new(($mx + 5), ($my + 3), ($mw - 10), ($mh - 6))
                if ($textArea.Width -le 0 -or $textArea.Height -le 0) { throw 'Annotation area is too small.' }
                $chars = 0
                $lines = 0
                $format = [Drawing.StringFormat]::GenericDefault
                $null = $graphics.MeasureString($mark.text, $font, $textArea.Size, $format, [ref]$chars, [ref]$lines)
                if ($chars -lt $mark.text.Length) { throw 'Annotation does not fit. Enlarge the area or shorten the caption.' }
                $graphics.DrawString($mark.text, $font, $ink, $textArea, $format)
            }
        }
    }
    $canvas.Save($data.output, [Drawing.Imaging.ImageFormat]::Png)
} finally {
    foreach ($frame in $bitmaps) { $frame.Dispose() }
    foreach ($resource in @($pen, $arrow, $font, $titleFont, $ink, $shadow, $graphics, $canvas)) { $resource.Dispose() }
}
