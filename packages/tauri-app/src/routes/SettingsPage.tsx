import { useState, useEffect } from "react";
import "./SettingsPage.css";

interface Settings {
  campaignPath: string;
  theme: "system" | "light" | "dark";
  githubConnected: boolean;
  githubUsername: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    campaignPath: "",
    theme: "system",
    githubConnected: false,
    githubUsername: null,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // TODO: Load settings from Tauri store

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function handleSelectCampaign() {
    // TODO: Open folder picker dialog
    console.log("Select campaign folder");
  }

  async function handleGitHubConnect() {
    // TODO: Initiate GitHub OAuth flow
    console.log("Connect to GitHub");
  }

  async function handleGitHubDisconnect() {
    // TODO: Clear GitHub tokens
    setSettings({ ...settings, githubConnected: false, githubUsername: null });
  }

  async function handleSync() {
    // TODO: Pull and push changes
    console.log("Sync with GitHub");
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Settings</h1>
      </header>

      {/* Connection Status */}
      {!isOnline && (
        <div className="offline-banner">
          <span className="offline-icon">⚠️</span>
          <span>You are offline. Changes will sync when connected.</span>
        </div>
      )}

      {/* Campaign Folder */}
      <section className="card settings-section">
        <h2>Campaign Folder</h2>
        <p className="section-description">
          Select the folder containing your D&D campaign files.
        </p>
        <div className="campaign-path">
          {settings.campaignPath ? (
            <span className="path-text">{settings.campaignPath}</span>
          ) : (
            <span className="path-placeholder">No folder selected</span>
          )}
        </div>
        <button onClick={handleSelectCampaign}>
          {settings.campaignPath ? "Change Folder" : "Select Folder"}
        </button>
      </section>

      {/* GitHub Integration */}
      <section className="card settings-section">
        <h2>GitHub Sync</h2>
        <p className="section-description">
          Connect to GitHub to sync your campaign across devices.
        </p>

        {settings.githubConnected ? (
          <div className="github-connected">
            <div className="github-user">
              <span className="github-avatar">👤</span>
              <div>
                <span className="github-username">{settings.githubUsername}</span>
                <span className="github-status">Connected</span>
              </div>
            </div>
            <div className="github-actions">
              <button onClick={handleSync} disabled={!isOnline}>
                Sync Now
              </button>
              <button className="btn-secondary" onClick={handleGitHubDisconnect}>
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button onClick={handleGitHubConnect} disabled={!isOnline}>
            Connect GitHub
          </button>
        )}
      </section>

      {/* Theme */}
      <section className="card settings-section">
        <h2>Appearance</h2>
        <div className="theme-options">
          {(["system", "light", "dark"] as const).map((theme) => (
            <button
              key={theme}
              className={`theme-option ${settings.theme === theme ? "active" : ""}`}
              onClick={() => setSettings({ ...settings, theme })}
            >
              <span className="theme-icon">
                {theme === "system" && "💻"}
                {theme === "light" && "☀️"}
                {theme === "dark" && "🌙"}
              </span>
              <span className="theme-label">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="card settings-section">
        <h2>About</h2>
        <div className="about-info">
          <div className="about-row">
            <span>Version</span>
            <span>1.0.0</span>
          </div>
          <div className="about-row">
            <span>Build</span>
            <span>Tauri 2.9.3</span>
          </div>
        </div>
      </section>
    </div>
  );
}
