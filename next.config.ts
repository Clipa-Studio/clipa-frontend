import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: '/blog',
        destination: '/blog/overview',
        statusCode: 301,
      },
      {
        source: '/blog/how-to-fix-screen-recording-audio-out-of-sync-on-mac-1778588656058',
        destination: '/blog/troubleshooting/fix-screen-recording-audio-out-of-sync-on-mac',
        statusCode: 301,
      },
      {
        source: '/blog/clipa-for-mac-screen-recording-and-editing-1778512517340',
        destination: '/blog/compare/clipa-for-mac-screen-recording-and-editing',
        statusCode: 301,
      },
      {
        source: '/blog/product-demo-video-on-mac-how-to-make-one-1778418993926',
        destination: '/blog/use-cases/product-demo-video-on-mac',
        statusCode: 301,
      },
      {
        source: '/blog/how-to-trim-a-screen-recording-on-mac-1777959230762',
        destination: '/blog/edit/how-to-trim-a-screen-recording-on-mac',
        statusCode: 301,
      },
      {
        source: '/blog/how-to-record-professional-looking-online-course-videos-on-mac-1777713117010',
        destination: '/blog/capture/record-online-course-videos-on-mac',
        statusCode: 301,
      },
      {
        source: '/blog/how-to-speed-up-a-screen-recording-on-mac-1777703123942',
        destination: '/blog/edit/how-to-speed-up-a-screen-recording-on-mac',
        statusCode: 301,
      },
      {
        source: '/blog/add-background-music-to-screen-recording-on-mac-no-imovie-needed-1777296968787',
        destination: '/blog/edit/add-background-music-to-screen-recording-on-mac',
        statusCode: 301,
      },
      {
        source: '/blog/how-ai-upscaling-turns-blurry-mac-screen-recordings-into-4k-1776694854042',
        destination: '/blog/export/ai-upscaling-mac-screen-recording',
        statusCode: 301,
      },
      {
        source: '/blog/how-to-add-zoom-effects-to-mac-screen-recordings-without-the-editing-hours-1776489215323',
        destination: '/blog/edit/add-zoom-effects-to-mac-screen-recordings',
        statusCode: 301,
      },
      {
        source: '/blog/clipa-studio-record-edit-and-export-screen-videos-in-one-native-mac-app-1776084463125',
        destination: '/blog/overview/clipa-studio-record-edit-export-screen-videos',
        statusCode: 301,
      },
      {
        source: '/blog/screen-studio-alternative-guide-for-mac-creators-1778422783464',
        destination: '/blog/compare/screen-studio-alternative-guide-for-mac-creators',
        statusCode: 301,
      },
    ]
  },
}

export default nextConfig
