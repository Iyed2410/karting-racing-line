# Quick Start Guide - Karting Racing Line Optimizer

## 5-Minute Quick Start

### Step 1: Open the App
1. Open `index.html` in your web browser
2. You should see an orange and white interface with a blank white canvas

### Step 2: Draw Your First Track (1 minute)
1. **Click on the canvas** to start drawing a simple oval:
   - Start at top-left: click around position (100, 100)
   - Move right and down: click (300, 100)
   - Bottom right: click (300, 300)
   - Bottom left: click (100, 300)
   - Back to start: click (100, 100)
2. You'll see a gray line forming as you click
3. Notice the **Points counter** shows how many points you've added

### Step 3: Generate Racing Line (2 minutes)
1. Look at the **Physics Parameters** panel on the right
2. Leave defaults as-is for now (Grip: 1.0)
3. **Click the green "Generate Racing Line" button**
4. Wait 1-2 seconds for optimization to complete
5. You'll see a **colored line appear** on your track:
   - 🔴 **Red areas** = slow corners
   - 🟢 **Green areas** = fast straights

### Step 4: Check Results (1 minute)
1. Look at the **Status Box** at the bottom:
   - Points: total track points
   - Track Length: total distance in meters
   - Lap Time: estimated time to complete the lap
2. **Enable "Show Apexes"** to see the tight turn points (orange dots)
3. **Enable "Speed Heatmap"** to see speed distribution more clearly

### Step 5: Experiment (1 minute)
Try these adjustments:
- **Increase Grip** → faster speeds throughout track
- **Decrease Grip** → slower speeds (wet track)
- **Change Acceleration** → affects how quickly speed changes
- **Generate again** → see new optimization results

---

## Loading Example Tracks

Instead of drawing, you can load pre-made example tracks:

1. Click **"📂 Load Track"** button
2. Navigate to `assets/example_tracks/` folder
3. Choose one:
   - `oval_track.json` - Easiest (simple oval)
   - `figure_eight.json` - Medium (two connected circles)
   - `monaco_style.json` - Hard (complex street circuit)
4. Click **"Generate Racing Line"**

---

## Mobile Quick Start

### Drawing on Phone/Tablet

**Single Finger (Draw)**
- Tap the canvas repeatedly to add points
- Each tap creates a track point

**Two Fingers (Pan)**
- Use two fingers to drag the canvas around
- Useful when track gets large

**Pinch to Zoom**
- Pinch outward to zoom in
- Pinch inward to zoom out

### Mobile Tips
- Use portrait mode for better control
- Take advantage of full-screen for larger canvas
- Buttons are sized for easy touch (44px minimum)

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Nothing appears? | Click the canvas - make sure cursor is active |
| Track won't smooth? | Add more points - minimum 3 required |
| Lap time shows "--"? | Generate racing line first with "Generate" button |
| Racing line looks weird? | Try increasing grip coefficient or smoothing |
| Can't pan? | Use right-click drag (or 2-finger on mobile) |
| Performance slow? | Reduce number of points or close other apps |

---

## Understanding the Physics

The app calculates max speed through each corner using:

**Speed = √(Grip × Gravity × Radius)**

- **Tight corner** (small radius) → **Lower max speed** (red line)
- **Wide corner** (large radius) → **Higher max speed** (green line)
- **Straight section** → **Highest possible speed** (brightest green)

When you adjust sliders:
- **Grip slider** = track conditions (0.6=rain, 1.0=normal, 1.5=perfect)
- **Acceleration slider** = kart power (how quickly you speed up)
- **Braking slider** = kart brakes (how quickly you slow down)

---

## Saving Your Work

### Save a Track
1. Draw your track
2. Click **"💾 Save Track"** button
3. File downloads as `track_TIMESTAMP.json`
4. Keep it safe!

### Load Saved Track
1. Click **"📂 Load Track"** button
2. Select your `.json` file
3. Your track and racing line reload instantly

---

## Common Mistakes & How to Avoid Them

❌ **Mistake 1**: Clicking randomly to draw track
✅ **Solution**: Click in deliberate path, going around circuit

❌ **Mistake 2**: Track points too close together
✅ **Solution**: Make bigger movements between clicks (app prevents duplicates)

❌ **Mistake 3**: Forgetting to close the circuit
✅ **Solution**: Last point should connect back near first point

❌ **Mistake 4**: Expecting perfect results with 3 points
✅ **Solution**: Use 12-20 points for realistic track

❌ **Mistake 5**: Not understanding slow vs fast areas
✅ **Solution**: Red = slow corners, Green = fast straights (physics-based!)

---

## Pro Tips

1. **Multiple attempts**: Try drawing the same track twice - compare results
2. **Test parameters**: Change grip and see immediate impact on colors
3. **Study apexes**: When "Show Apexes" enabled, see where braking & turning happens
4. **Export images**: Take screenshots for comparison with real track
5. **Experiment**: Try extreme values (grip 0.6 vs 1.5) to understand physics

---

## What's Happening Behind the Scenes?

When you click **"Generate Racing Line"**:

1. **Analyzes geometry** - Calculates radius and curvature of every turn
2. **Applies physics** - Determines max safe speed for each turn
3. **Creates initial path** - Uses "apex hunting" technique
4. **Optimizes** - Makes 30 small adjustments to minimize lap time
5. **Smooths** - Creates driver-friendly curves
6. **Validates** - Checks racing line stays on track

All in **1-2 seconds** on your device!

---

## Next Steps After Quick Start

- **Read full README.md** for advanced features
- **Try all example tracks** to see different complexities
- **Experiment with edge values** for physics parameters
- **Compare different optimization results** by toggling visualizations
- **Create your own complex tracks** and optimize them

---

**Ready?** Open `index.html` and start drawing! 🏎️✨
