# Changelog

All notable changes to Minance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **AI Settings**: Replaced credential + preferences model with a simplified profile-based system.
  Each profile bundles provider, model, and API key under a required name. Users can create
  multiple profiles and activate one at a time. API keys are never returned to the browser.
  Removed failover provider chain and feature-level overrides.

### Added

- `model` column to `ai_provider_credentials` table and schema.
- `active_profile_id` column to `ai_provider_preferences` table, replacing the
  `default_provider`/`default_model`/`failover_providers` preference model.
- `PATCH /v1/ai/credentials/:id` endpoint for updating profile metadata without a key.
- `PUT /v1/ai/credentials/activate` endpoint for setting the active profile.
- Auto-activation of the first created profile, and auto-fallback to the next profile
  when the active one is deleted.

### Removed

- `failoverProviders` and `featureOverrides` from `ProviderPreferences`.
- Separate "Add Provider Key" and "Preferences & Failover" panels — unified into a
  single profile list + add/edit form.

## [0.1.0] - 2026-07-22

### Added

- Initial versioned release of Minance.
