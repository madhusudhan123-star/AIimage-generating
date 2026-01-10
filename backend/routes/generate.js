// const express = require('express');
// const Groq = require('groq-sdk');
// const Generation = require('../models/Generation');
// const authMiddleware = require('../middleware/auth');
// const axios = require('axios'); // Add this

// const router = express.Router();
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// // Function to poll until real image is ready
// const waitForImageReady = async (url, maxRetries = 10) => {
//   for (let i = 0; i < maxRetries; i++) {
//     try {
//       console.log(`Checking image (attempt ${i + 1}/${maxRetries})...`);
      
//       // Make HEAD request to check without downloading full image
//       const response = await axios.head(url, { 
//         timeout: 5000,
//         validateStatus: (status) => status < 500 // Accept redirects
//       });
      
//       // Check if we got redirected (Pollinations redirects when ready)
//       const finalUrl = response.request.res.responseUrl || url;
      
//       // If URL contains "Generate" or is same as input, image not ready yet
//       if (finalUrl.includes('/prompt/Generate') || finalUrl === url) {
//         console.log(`Image not ready yet, waiting... (URL still has /prompt/Generate)`);
//         await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
//         continue;
//       }
      
//       // URL changed and doesn't contain "Generate" - image is ready!
//       console.log(`Image ready! Final URL: ${finalUrl}`);
//       return finalUrl;
      
//     } catch (error) {
//       console.log(`Attempt ${i + 1} failed:`, error.message);
      
//       if (i < maxRetries - 1) {
//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
//     }
//   }
  
//   // If all retries failed, return original URL
//   console.log('Max retries reached, returning original URL');
//   return url;
// };

// router.post('/image', authMiddleware, async (req, res) => {
//   try {
//     const { prompt } = req.body;
    
//     // Step 1: Enhance prompt with Groq
//     const completion = await groq.chat.completions.create({
//       messages: [{
//         role: 'user',
//         content: `Enhance this image prompt to be detailed and professional for AI image generation. Only return the enhanced prompt, nothing else: "${prompt}"`
//       }],
//       model: 'llama-3.1-8b-instant',
//       temperature: 0.7,
//     });
    
//     // Remove quotes from Groq response
//     const enhancedPrompt = completion.choices[0].message.content
//       .trim()
//       .replace(/^["']|["']$/g, '');
    
//     const seed = Math.floor(Math.random() * 1000000);
    
//     // Step 2: Generate image URL with Pollinations
//     const initialImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?seed=${seed}&width=1024&height=1024&model=flux&enhance=true`;
    
//     console.log('Initial URL:', initialImageUrl);
    
//     // Step 3: Wait for real image to be ready (poll until URL changes)
//     const finalImageUrl = await waitForImageReady(initialImageUrl);
    
//     console.log('Final URL:', finalImageUrl);
    
//     // Step 4: Save to database with final URL
//     const generation = new Generation({
//       userId: req.userId,
//       prompt,
//       enhancedPrompt,
//       imageUrl: finalImageUrl, // Use final URL, not initial
//       seed
//     });
//     await generation.save();
    
//     res.json({ 
//       imageUrl: finalImageUrl,
//       enhancedPrompt, 
//       seed 
//     });
    
//   } catch (error) {
//     console.error('Image generation error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get user's generation history
// router.get('/history', authMiddleware, async (req, res) => {
//   try {
//     const generations = await Generation.find({ userId: req.userId })
//       .sort({ createdAt: -1 })
//       .limit(50);
//     res.json(generations);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;


const express = require('express');
const Groq = require('groq-sdk');
const Generation = require('../models/Generation');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/image', authMiddleware, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Step 1: Enhance prompt with Groq
    const completion = await groq.chat.completions.create({
      messages: [{
        role: 'user',
        content: `Enhance this image prompt to be detailed and professional for AI image generation. Only return the enhanced prompt, nothing else: "${prompt}"`
      }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
    });
    
    const enhancedPrompt = completion.choices[0].message.content
      .trim()
      .replace(/^["']|["']$/g, '');
    
    const seed = Math.floor(Math.random() * 1000000);
    
    // Step 2: Generate image URL with Pollinations
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?seed=${seed}&width=1920&height=1920&model=flux&enhance=true`;
    
    // Step 3: Validate image URL by fetching it
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Image generation failed with status: ${imageResponse.status}`);
    }
    
    // Optional: Verify content-type is an image
    const contentType = imageResponse.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('Invalid image response from Pollinations API');
    }
    
    // Step 4: Save to database ONLY after validation
    const generation = new Generation({
      userId: req.userId,
      prompt,
      enhancedPrompt,
      imageUrl,
      seed
    });
    await generation.save();
    
    res.json({ imageUrl, enhancedPrompt, seed });
    
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});



// Get user's generation history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const generations = await Generation.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(generations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
