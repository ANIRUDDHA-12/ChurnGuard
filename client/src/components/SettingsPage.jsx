import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    Cog6ToothIcon,
    BellIcon,
    CurrencyDollarIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import { SERVER_URL } from '../config';

const SERVER_BASE = SERVER_URL;

// Default settings
const defaultSettings = {
    riskThresholds: {
        high: 70,
        medium: 40,
    },
    ltv: 500,
    sentinelInterval: 60,
    emailNotifications: true,
    dryRunMode: false,
};

function SettingsPage({ onBack }) {
    const [settings, setSettings] = useState(defaultSettings);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load saved settings from localStorage
        const saved = localStorage.getItem('churnguard_settings');
        if (saved) {
            setSettings({ ...defaultSettings, ...JSON.parse(saved) });
        }
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleNestedChange = (parent, key, value) => {
        setSettings(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [key]: value }
        }));
        setSaved(false);
    };

    const saveSettings = async () => {
        setSaving(true);

        // Simulate save delay
        await new Promise(r => setTimeout(r, 800));

        localStorage.setItem('churnguard_settings', JSON.stringify(settings));

        // Update server config if possible
        try {
            await fetch(`${SERVER_BASE}/api/sentinel/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: !settings.dryRunMode,
                    intervalMinutes: settings.sentinelInterval,
                }),
            });
        } catch (err) {
            console.error('Failed to update server config');
        }

        setSaving(false);
        setSaved(true);
    };

    return (
        <div className="settings-page">
            <header className="settings-header">
                <div className="header-left">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="back-button"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </motion.button>
                    <div className="header-title">
                        <h1>Settings</h1>
                        <span className="header-subtitle">Configure ChurnGuard preferences</span>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            <div className="settings-content">
                {/* Risk Thresholds */}
                <section className="settings-section">
                    <h2>
                        <Cog6ToothIcon className="w-5 h-5" />
                        Risk Thresholds
                    </h2>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label>High Risk Threshold (%)</label>
                            <input
                                type="number"
                                min="50"
                                max="100"
                                value={settings.riskThresholds.high}
                                onChange={(e) => handleNestedChange('riskThresholds', 'high', parseInt(e.target.value))}
                            />
                            <span className="setting-hint">Users above this % are flagged as high risk</span>
                        </div>
                        <div className="setting-item">
                            <label>Medium Risk Threshold (%)</label>
                            <input
                                type="number"
                                min="20"
                                max="70"
                                value={settings.riskThresholds.medium}
                                onChange={(e) => handleNestedChange('riskThresholds', 'medium', parseInt(e.target.value))}
                            />
                            <span className="setting-hint">Users above this % are medium risk</span>
                        </div>
                    </div>
                </section>

                {/* ROI Settings */}
                <section className="settings-section">
                    <h2>
                        <CurrencyDollarIcon className="w-5 h-5" />
                        ROI Calculation
                    </h2>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label>Estimated LTV ($)</label>
                            <input
                                type="number"
                                min="100"
                                max="5000"
                                value={settings.ltv}
                                onChange={(e) => handleChange('ltv', parseInt(e.target.value))}
                            />
                            <span className="setting-hint">Average lifetime value per customer</span>
                        </div>
                    </div>
                </section>

                {/* Sentinel Settings */}
                <section className="settings-section">
                    <h2>
                        <ClockIcon className="w-5 h-5" />
                        Sentinel Automation
                    </h2>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <label>Scan Interval (minutes)</label>
                            <input
                                type="number"
                                min="5"
                                max="1440"
                                value={settings.sentinelInterval}
                                onChange={(e) => handleChange('sentinelInterval', parseInt(e.target.value))}
                            />
                            <span className="setting-hint">How often Sentinel scans for at-risk users</span>
                        </div>
                        <div className="setting-item toggle">
                            <label>Dry Run Mode</label>
                            <button
                                className={`toggle-btn ${settings.dryRunMode ? 'on' : ''}`}
                                onClick={() => handleChange('dryRunMode', !settings.dryRunMode)}
                            >
                                <span className="toggle-knob" />
                            </button>
                            <span className="setting-hint">Test mode - no actual interventions</span>
                        </div>
                    </div>
                </section>

                {/* Notifications */}
                <section className="settings-section">
                    <h2>
                        <BellIcon className="w-5 h-5" />
                        Notifications
                    </h2>
                    <div className="settings-grid">
                        <div className="setting-item toggle">
                            <label>Email Notifications</label>
                            <button
                                className={`toggle-btn ${settings.emailNotifications ? 'on' : ''}`}
                                onClick={() => handleChange('emailNotifications', !settings.emailNotifications)}
                            >
                                <span className="toggle-knob" />
                            </button>
                            <span className="setting-hint">Receive daily digest and alerts</span>
                        </div>
                    </div>
                </section>

                {/* Save Button */}
                <div className="settings-actions">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`save-btn ${saved ? 'saved' : ''}`}
                        onClick={saveSettings}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
