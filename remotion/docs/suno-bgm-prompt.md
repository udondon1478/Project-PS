# Suno AI BGM Prompt Design Guide — Per-Scene Approach

各シーンごとに独立したBGMを生成し、クロスフェードで繋ぐ方式。
シーンごとに最適なBPM・キー・ムードを設定できる。

---

## Architecture

```
Sec:   0----5----10---15---20---25---30---35---40---45---50---55---60--62
Video: [  S1 Problem     ][S2 Sol  ][ S3 Social][    S4 Demo             ][S5]
BPM:       75 (free)         90        110           92                  100
Key:       Cm               Cmaj       Cmaj         Cmaj                Cmaj
Feel:  Dark drone ━━━━→ Hope ↗ Bounce ♪♪  Calm focus ──────────→ Bright ✧
Xfade:                  |60f|       |60f|        |60f|               |60f|
```

- 全トラックの基本キーをC系で統一 → クロスフェード時の調性衝突を防止
- Suno生成後、各シーンの尺にトリム → タイミング制御が確実
- 各トランジション区間（60フレーム=1秒）でクロスフェード

---

## Per-Scene Timing

| Scene | Duration | Frames | Abs Start | Abs End | BPM | Key |
|-------|----------|--------|-----------|---------|-----|-----|
| S1 Problem | 17.0s | 1020 | 0 | 1020 | ~75 | Cm |
| S2 Solution | 9.0s | 540 | 960 | 1500 | ~90 | C |
| S3 Social | 9.0s | 540 | 1440 | 1980 | ~110 | C |
| S4 Demo | 24.3s | 1460 | 1920 | 3380 | ~92 | C |
| S5 CTA | 6.0s | 360 | 3320 | 3680 | ~100 | C |

Abs Start/End にはTransitionSeriesの60フレーム重複を反映済み。

---

## Scene 1: Problem (17s)

**Mood:** 暗い緊張、不満、不安が徐々に高まる
**BPM:** ~75 (or free tempo ambient)
**Key:** C minor

### Suno Settings
- **Instrumental**: ON
- **Style of Music:**
```
dark ambient, cinematic tension, minimal drone, dissonant piano, instrumental, 75 bpm
```

### Prompt A (recommended)
**Lyrics:**
```
[Intro: Dark low drone, Cm minor, distant rumble, unsettling atmosphere]
da da da da, da da da da
da da da da, da da da da
da da da da, da da da da

[Build: Sparse dissonant piano notes, tension slowly rising, dark pad swells]
da da da da, da da da da
da da da da, da da da da
da da da da, da da da da
da da da da, da da da da

[End]
```

### Prompt B (description)
**Lyrics:**
```
[Intro: 3 bars, dark low drone in Cm, distant rumble, complete darkness, no rhythm]

[Build: 4 bars, sparse dissonant piano enters, tension slowly rising, dark pad swells growing, sense of unease and frustration building]

[End]
```

### Post-processing
```bash
# Trim to 17s, fade in 1s, fade out 1s for crossfade with S2
ffmpeg -i suno_s1.mp3 -t 17 -af "afade=t=in:d=1,afade=t=out:st=16:d=1,loudnorm=I=-20:TP=-3:LRA=7" -b:a 192k bgm_scene1.mp3
```

---

## Scene 2: Solution (9s)

**Mood:** 安堵、希望、ロゴ登場の「光が差す」感覚
**BPM:** ~90
**Key:** C major (S1のCmからメジャーへ転調 = 希望感)

### Suno Settings
- **Instrumental**: ON
- **Style of Music:**
```
ambient electronic, hopeful, cinematic reveal, shimmering synth, warm pad, instrumental, 90 bpm
```

### Prompt A (recommended)
**Lyrics:**
```
[Intro: Bright synth arpeggio in C major, warm pad swell, light emerging from darkness, hopeful]
da da da da, da da da da
da da da da, da da da da

[Verse: Shimmering keys, gentle upward melody, a door opening to light, airy and warm]
da da da da, da da da da
da da da da, da da da da

[End]
```

### Prompt B (description)
**Lyrics:**
```
[Intro: 2 bars, sudden shift to C major, bright shimmering synth arpeggio, warm pad swell, light emerging, sense of relief and discovery]

[Verse: 2 bars, gentle upward melody on soft keys, airy and warm, a door opening to light, hope building]

[End]
```

### Post-processing
```bash
# Trim to 9s, fade in/out 1s for crossfades
ffmpeg -i suno_s2.mp3 -t 9 -af "afade=t=in:d=1,afade=t=out:st=8:d=1,loudnorm=I=-20:TP=-3:LRA=7" -b:a 192k bgm_scene2.mp3
```

---

## Scene 3: Social Tagging (9s)

**Mood:** 活気、コラボレーション、楽しさ、タグが飛び交う軽快さ
**BPM:** ~110 (bouncy, energetic)
**Key:** C major

### Suno Settings
- **Instrumental**: ON
- **Style of Music:**
```
lo-fi tech, bouncy electronic, playful synth, upbeat, community vibe, instrumental, 110 bpm
```

### Prompt A (recommended)
**Lyrics:**
```
[Verse: Bouncy plucked synth melody in C, light rhythmic pulse, playful and warm]
da da da da, da da da da
da da da da, da da da da

[Chorus: Energetic beat drops in, fun community energy, bright staccato synths, positive]
da da da da, da da da da
da da da da, da da da da

[End]
```

### Prompt B (description)
**Lyrics:**
```
[Verse: 2 bars, playful plucked synth melody in C major, light bouncy rhythm, warm and inviting]

[Chorus: 2 bars, full energetic beat, staccato synths, fun collaborative energy, bright and positive, tags flying]

[End]
```

### Post-processing
```bash
# Trim to 9s, fade in/out 1s for crossfades
ffmpeg -i suno_s3.mp3 -t 9 -af "afade=t=in:d=1,afade=t=out:st=8:d=1,loudnorm=I=-20:TP=-3:LRA=7" -b:a 192k bgm_scene3.mp3
```

---

## Scene 4: Demo (24.3s)

**Mood:** 集中、明快、信頼感、穏やかなプロフェッショナル感
**BPM:** ~92 (calm, steady)
**Key:** C major

最長シーン。ループ感のある安定したグルーブが重要。
ナレーションが最も長い区間（22秒）のため、メロディは控えめに。

### Suno Settings
- **Instrumental**: ON
- **Style of Music:**
```
minimal electronic, clean ambient, soft lo-fi beat, corporate calm, focused, instrumental, 92 bpm
```

### Prompt A (recommended)
**Lyrics:**
```
[Verse: Clean minimal beat in C, soft floating keys, gentle steady groove, focused and airy]
da da da da, da da da da
da da da da, da da da da
da da da da, da da da da
da da da da, da da da da

[Chorus: Same groove continues, subtle variation, loopable pattern, soft background feel]
da da da da, da da da da
da da da da, da da da da
da da da da, da da da da
da da da da, da da da da

[Bridge: Gentle melodic lift, still calm, building slight warmth toward ending]
da da da da, da da da da
da da da da, da da da da

[End]
```

### Prompt B (description)
**Lyrics:**
```
[Verse: 4 bars, clean minimal beat in C major, soft floating keys, gentle steady groove, focused airy background]

[Chorus: 4 bars, same groove with subtle variation, loopable pattern, calm professional feel, unobtrusive]

[Bridge: 2 bars, gentle melodic lift while maintaining calm, slight warmth building]

[End]
```

### Post-processing
```bash
# Trim to 25s (slightly longer than scene for crossfade), fade in/out 1s
ffmpeg -i suno_s4.mp3 -t 25 -af "afade=t=in:d=1,afade=t=out:st=24:d=1,loudnorm=I=-20:TP=-3:LRA=7" -b:a 192k bgm_scene4.mp3
```

---

## Scene 5: CTA (6s)

**Mood:** 前向き、招待、明るい解放感
**BPM:** ~100 (uplifting)
**Key:** C major

短い締めくくり。明るいコード解決感が重要。

### Suno Settings
- **Instrumental**: ON
- **Style of Music:**
```
uplifting electronic, bright ambient, cinematic resolution, optimistic synth, instrumental, 100 bpm
```

### Prompt A (recommended)
**Lyrics:**
```
[Outro: Bright chord resolution in C major, uplifting final phrase, sparkling synth, optimistic and inviting, gentle fade]
da da da da, da da da da
da da da da, da da da da

[End]
```

### Prompt B (description)
**Lyrics:**
```
[Outro: 2 bars, bright triumphant C major chord resolution, uplifting sparkling synth, optimistic inviting atmosphere, gentle fade out]

[End]
```

### Post-processing
```bash
# Trim to 7s, fade in 1s, fade out 2s (video ending)
ffmpeg -i suno_s5.mp3 -t 7 -af "afade=t=in:d=1,afade=t=out:st=5:d=2,loudnorm=I=-20:TP=-3:LRA=7" -b:a 192k bgm_scene5.mp3
```

---

## Key Compatibility Chart

全シーンをC系で統一し、クロスフェード時の調性衝突を最小化:

```
S1 (Cm) ──crossfade──→ S2 (C) ──crossfade──→ S3 (C)
                              relative major         same key

S3 (C) ──crossfade──→ S4 (C) ──crossfade──→ S5 (C)
        same key             same key
```

- S1→S2: Cm→C (マイナー→メジャー転調。暗→明の感情変化と一致)
- S2→S3以降: 全てCメジャー (BPMの変化だけでムードを制御)

---

## Generation Workflow

### Step 1: 生成
各シーンごとにSuno AIで3-5回生成:
1. Custom Mode → Instrumental ON
2. Prompt A を入力
3. 生成結果を聴いて雰囲気を確認
4. 気に入らなければ Prompt B で再試行

### Step 2: 選曲判断基準
- S1: 暗いドローンが支配的で、リズムが入らないこと
- S2: 明るさが感じられ、S1のCmからCメジャーへの変化が感じられること
- S3: 弾むリズムがあり、楽しいエネルギーが感じられること
- S4: **最重要** — 穏やかでループ感があり、24秒間飽きないこと
- S5: 明るい解決感があり、短くまとまること

### Step 3: トリミング
各トラックをシーン尺に合わせてトリム（上記のffmpegコマンド参照）

### Step 4: ラウドネス統一
全5トラックを同じラウドネス（-20 LUFS）に揃えること。
クロスフェード時の音量ジャンプを防止。

### Step 5: 配置
```
remotion/public/audio/
  bgm_scene1.mp3
  bgm_scene2.mp3
  bgm_scene3.mp3
  bgm_scene4.mp3
  bgm_scene5.mp3
```

### Step 6: 確認
Remotion Studio でプレビュー再生し、クロスフェードの自然さを確認。

---

## Genre Variants (Style of Music alternatives)

### S1 variants
| Direction | Style |
|-----------|-------|
| Dark ambient (rec.) | `dark ambient, cinematic tension, minimal drone, dissonant piano, instrumental, 75 bpm` |
| Horror-lite | `dark cinematic, suspenseful, eerie pad, sparse percussion, instrumental, 70 bpm` |
| Industrial ambient | `industrial ambient, dark electronic, low rumble, mechanical tension, instrumental, 80 bpm` |

### S2 variants
| Direction | Style |
|-----------|-------|
| Cinematic reveal (rec.) | `ambient electronic, hopeful, cinematic reveal, shimmering synth, warm pad, instrumental, 90 bpm` |
| Ethereal | `ethereal ambient, dreamy synth, bright pads, floating, instrumental, 88 bpm` |

### S3 variants
| Direction | Style |
|-----------|-------|
| Bouncy tech (rec.) | `lo-fi tech, bouncy electronic, playful synth, upbeat, community vibe, instrumental, 110 bpm` |
| Chiptune-lite | `chiptune, retro electronic, fun, bouncy 8-bit, positive energy, instrumental, 112 bpm` |

### S4 variants
| Direction | Style |
|-----------|-------|
| Minimal clean (rec.) | `minimal electronic, clean ambient, soft lo-fi beat, corporate calm, focused, instrumental, 92 bpm` |
| Lo-fi study | `lo-fi study beats, chill, warm, soft keys, gentle groove, instrumental, 90 bpm` |
| Corporate | `corporate background, modern clean, professional, subtle beat, instrumental, 95 bpm` |

### S5 variants
| Direction | Style |
|-----------|-------|
| Uplifting (rec.) | `uplifting electronic, bright ambient, cinematic resolution, optimistic synth, instrumental, 100 bpm` |
| Triumphant | `triumphant, uplifting, bright fanfare, electronic, hopeful climax, instrumental, 100 bpm` |
