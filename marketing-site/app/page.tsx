export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            AutoMerge Pro
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered automated pull request reviews and merging with intelligent risk scoring
          </p>
          <div className="space-x-4">
            <a
              href="https://github.com/marketplace/automerge-pro"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Install on GitHub
            </a>
            <a
              href="/docs"
              className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700"
            >
              View Documentation
            </a>
          </div>
        </div>
        
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">AI-Powered Analysis</h3>
            <p className="text-gray-600">
              Advanced AI risk scoring using GPT-4 to analyze code changes and security implications.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Smart Automation</h3>
            <p className="text-gray-600">
              Customizable rules for automatic approval and merging based on file patterns and risk scores.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Team Collaboration</h3>
            <p className="text-gray-600">
              Real-time notifications, analytics dashboard, and team management features.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}