import express from 'express';

export const vimeoRouter = express.Router();

// Route to extract Vimeo subtitle tracks metadata
vimeoRouter.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Vimeo URL is required' });
    }

    // Extract Video ID using RegExp
    const vimeoRegExp = /(?:videos?\/|vimeo\.com\/)(?:channels\/[^/]+\/|groups\/[^/]+\/forum\/discussion\/|album\/[^/]+\/video\/|showcase\/[^/]+\/video\/)?([0-9]+)/;
    const match = url.match(vimeoRegExp);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      return res.status(400).json({ error: 'Invalid Vimeo URL format' });
    }

    // Fetch public configuration from Vimeo player endpoint
    const configResponse = await fetch(`https://player.vimeo.com/video/${videoId}/config`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!configResponse.ok) {
      return res.status(404).json({ error: 'Failed to retrieve video details. Is the video private?' });
    }

    const configData = await configResponse.json();
    
    // Extract video details and available tracks
    const videoTitle = configData.video?.title || 'vimeo_video';
    const textTracks = configData.request?.text_tracks || [];

    const formattedTracks = textTracks.map((track: any) => ({
      id: track.id,
      lang: track.lang, // e.g. "en"
      label: track.label, // e.g. "English [CC]"
      url: track.url, // CDN URL pointing directly to the .vtt file
    }));

    return res.json({
      title: videoTitle,
      tracks: formattedTracks,
    });
  } catch (err: any) {
    console.error('Vimeo extraction error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Proxy route to bypass CORS for VTT files
vimeoRouter.get('/proxy', async (req, res) => {
  const trackUrl = req.query.url as string;

  if (!trackUrl) {
    return res.status(400).json({ error: 'Track URL is required' });
  }

  try {
    const response = await fetch(trackUrl);
    if (!response.ok) throw new Error('Failed to fetch from Vimeo CDN');
    
    const textData = await response.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(textData);
  } catch (err) {
    console.error('Vimeo proxy error:', err);
    return res.status(500).json({ error: 'Failed to proxy track' });
  }
});
