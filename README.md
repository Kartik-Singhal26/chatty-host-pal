
# Astrova.ai - Advanced AI Voice Assistant

A sophisticated AI voice assistant built with cutting-edge technology, featuring real-time voice interaction, intelligent responses powered by GPT-4o, and seamless speech synthesis.

## 🚀 Features

- **Advanced Voice Recognition** - Crystal-clear speech processing with real-time transcription
- **GPT-4o Integration** - Intelligent, context-aware responses
- **Natural Voice Synthesis** - Professional female voice output with customizable settings
- **Real-time Interaction** - Instant voice-to-voice communication
- **Session Management** - Maintains conversation context across interactions
- **Modern UI** - Minimal, sleek interface built with React and Tailwind CSS

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Voice**: Web Speech API (Recognition & Synthesis)
- **AI**: OpenAI GPT-4o via Supabase Edge Functions
- **Backend**: Supabase (Database, Authentication, Edge Functions)
- **Icons**: Lucide React

## 🏗️ Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── VoiceControls.tsx   # Voice interaction controls
│   ├── ConversationDisplay.tsx # Chat interface
│   └── VoiceInteraction.tsx # Main voice component
├── pages/
│   └── Index.tsx          # Main application page
├── integrations/
│   └── supabase/          # Supabase configuration
└── hooks/                 # Custom React hooks
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd astrova-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Create a Supabase project
   - Add your OpenAI API key to Supabase secrets
   - Configure environment variables

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Add the following secrets in your Supabase dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
3. Deploy the edge functions (automatically handled)

### Voice Configuration

The app uses the Web Speech API which requires:
- HTTPS in production (automatically handled by deployment)
- Microphone permissions
- Modern browser support

## 🎯 Usage

1. **Start Voice Interaction**: Click the microphone button
2. **Speak Naturally**: The AI will process your speech in real-time
3. **Listen to Response**: AI responds with natural voice synthesis
4. **Continue Conversation**: Maintains context throughout the session

## 🌐 Deployment

### Deploy with Lovable
1. Click the "Publish" button in the Lovable editor
2. Your app will be deployed with automatic HTTPS

### Custom Domain
1. Navigate to Project > Settings > Domains in Lovable
2. Connect your custom domain (requires paid plan)

### Manual Deployment
The app can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## 🔒 Security & Privacy

- All voice processing happens in real-time
- No audio data is permanently stored
- Conversations are session-based
- Secure API communication via Supabase

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Lovable Docs](https://docs.lovable.dev/)
- **Community**: [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **Issues**: Create an issue in this repository

## 🎨 Customization

### Voice Settings
Modify voice parameters in `VoiceInteraction.tsx`:
- Rate, pitch, volume adjustments
- Voice selection preferences
- Language settings

### UI Styling
Built with Tailwind CSS for easy customization:
- Color schemes in `tailwind.config.ts`
- Component styling in individual files
- Responsive design built-in

---

**Built with ❤️ using [Lovable](https://lovable.dev)**
