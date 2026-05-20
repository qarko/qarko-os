import { CheckCircle2, ExternalLink, KeyRound, PlugZap, Server, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getHermesVerifiedInstallPlan } from "../../adapters/hermesDesktop";
import { hermesProviderOptions } from "../../data/hermesProviders";
import { useQarkoStore } from "../../store/useQarkoStore";
import { StatusBadge } from "../ui/StatusBadge";

const steps = [
  { id: "install", label: "Install" },
  { id: "provider", label: "Provider" },
  { id: "auth", label: "Auth / Model" },
  { id: "test", label: "Check" },
];

export function HermesOnboarding() {
  const {
    checkHermesInstall,
    dismissHermesOnboarding,
    hermesAuthMessage,
    hermesAuthStatus,
    hermesConnection,
    hermesExecutablePath,
    hermesInstallMessage,
    hermesInstallStatus,
    hermesSetupOutput,
    hermesSetupProvider,
    installHermesDesktop,
    loginHermesOAuthProvider,
    openHermesSetupWizard,
    saveHermesGuidedSetup,
    showHermesOnboarding,
    testHermesRuntime,
    updateHermesConnection,
    updateHermesSetupProvider,
  } = useQarkoStore();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (showHermesOnboarding) setStepIndex(0);
  }, [showHermesOnboarding]);

  useEffect(() => {
    if (showHermesOnboarding) void checkHermesInstall();
  }, [checkHermesInstall, showHermesOnboarding]);

  const selectedProvider = useMemo(
    () => hermesProviderOptions.find((option) => option.id === hermesSetupProvider) ?? hermesProviderOptions[0],
    [hermesSetupProvider]
  );
  const hermesInstallPlan = getHermesVerifiedInstallPlan();

  if (!showHermesOnboarding) return null;

  const installed = hermesInstallStatus === "installed";
  const needsRepair = hermesInstallStatus === "error";
  const installing = hermesInstallStatus === "installing";
  const isOauth = selectedProvider.authType === "oauth";
  const loggingIn = hermesAuthStatus === "running";
  const canSave = installed && hermesConnection.modelName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-line bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">Hermes setup wizard</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">Connect Hermes to QARKO OS</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Use the native Hermes setup/auth terminal when Hermes needs interactive model selection, URLs, or device codes.
            </p>
          </div>
          <button onClick={dismissHermesOnboarding} className="rounded-md border border-line p-2 text-stone-500 hover:bg-panel hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[220px_1fr]">
          <aside className="border-b border-line bg-panel p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const active = index === stepIndex;
                return (
                  <button
                    key={step.id}
                    onClick={() => setStepIndex(index)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold ${
                      active ? "bg-white text-ink shadow-sm" : "text-stone-600 hover:bg-white/70"
                    }`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${active ? "bg-ink text-white" : "bg-white text-moss"}`}>
                      {index + 1}
                    </span>
                    {step.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 rounded-md bg-white p-3 text-xs leading-5 text-stone-600">
              QARKO does not force one model provider. Choose the provider and model that match the user's account and budget.
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5 thin-scrollbar">
            {stepIndex === 0 ? (
              <div className="space-y-4">
                <div className="rounded-md bg-panel p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <StatusBadge tone={installed ? "completed" : needsRepair ? "failed" : installing ? "running" : "planned"} label={installed ? "Installed" : installing ? "Installing" : needsRepair ? "Repair needed" : "Not checked"} />
                    <span className="text-sm font-semibold text-ink">Hermes status</span>
                  </div>
                  <p className="text-sm leading-6 text-stone-700">{hermesInstallMessage}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-600">
                    Verified channel: {hermesInstallPlan.label}. Advanced users can continue with the native Hermes setup wizard.
                  </p>
                  {hermesExecutablePath ? <p className="mt-2 break-all text-xs text-stone-500">{hermesExecutablePath}</p> : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button onClick={installHermesDesktop} disabled={installing} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60">
                    <PlugZap className="h-4 w-4" />
                    {needsRepair ? "Repair Hermes" : "Install Hermes"}
                  </button>
                  <button onClick={() => openHermesSetupWizard()} disabled={!installed} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
                    <ExternalLink className="h-4 w-4" />
                    Open setup
                  </button>
                  <button onClick={checkHermesInstall} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
                    <CheckCircle2 className="h-4 w-4" />
                    Check install
                  </button>
                </div>
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">Choose provider</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">Pick the account or API provider Hermes should use.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {hermesProviderOptions.map((option) => {
                    const active = option.id === hermesSetupProvider;
                    return (
                      <button key={option.id} onClick={() => updateHermesSetupProvider(option.id)} className={`rounded-md border p-4 text-left transition ${active ? "border-signal bg-panel shadow-sm" : "border-line bg-white hover:bg-panel"}`}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-ink">{option.label}</span>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-moss">{option.authType}</span>
                        </div>
                        <p className="text-sm leading-6 text-stone-600">{option.summary}</p>
                        <p className="mt-2 break-all text-xs text-stone-500">Default model: {option.defaultModel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {stepIndex === 2 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">{selectedProvider.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{selectedProvider.setupHint}</p>
                </div>

                {isOauth ? (
                  <div className="rounded-md border border-line bg-panel p-4 text-sm leading-6 text-stone-700">
                    <p className="font-semibold text-ink">OAuth login</p>
                    <p className="mt-1">This opens a visible Hermes terminal. Follow the URL or device code shown there, then return to QARKO and check auth status.</p>
                    <button onClick={loginHermesOAuthProvider} disabled={!installed || loggingIn} className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                      <ExternalLink className="h-4 w-4" />
                      {loggingIn ? "Opening..." : "Open auth terminal"}
                    </button>
                    <p className="mt-3 text-xs leading-5 text-stone-600">{hermesAuthMessage}</p>
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Model</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {selectedProvider.modelOptions.map((model) => {
                        const active = hermesConnection.modelName === model.id;
                        return (
                          <button key={model.id} onClick={() => updateHermesConnection({ modelName: model.id })} className={`rounded-md border p-3 text-left text-sm ${active ? "border-signal bg-panel" : "border-line bg-white hover:bg-panel"}`}>
                            <span className="block font-semibold text-ink">{model.label}</span>
                            <span className="mt-1 block text-xs text-stone-500">{model.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Custom model name
                    <input value={hermesConnection.modelName} onChange={(event) => updateHermesConnection({ modelName: event.target.value })} placeholder={selectedProvider.defaultModel} className="rounded-md border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-signal" />
                  </label>

                  {selectedProvider.authType !== "oauth" ? (
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      {selectedProvider.keyLabel ?? "API Key"}
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
                        <input type="password" value={hermesConnection.apiKey} onChange={(event) => updateHermesConnection({ apiKey: event.target.value })} placeholder="Enter API key" className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal" />
                      </div>
                      <span className="text-xs font-normal leading-5 text-stone-500">The key is kept in the current app session only. Re-enter it after reopening QARKO OS.</span>
                    </label>
                  ) : null}

                  {selectedProvider.authType === "custom-endpoint" ? (
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      API base URL
                      <div className="relative">
                        <Server className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-moss" />
                        <input value={hermesConnection.endpoint} onChange={(event) => updateHermesConnection({ endpoint: event.target.value })} placeholder={selectedProvider.defaultEndpoint} className="w-full rounded-md border border-line bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none focus:border-signal" />
                      </div>
                    </label>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={saveHermesGuidedSetup} disabled={!canSave} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
                    <ShieldCheck className="h-4 w-4" />
                    Save model settings
                  </button>
                  <button onClick={() => openHermesSetupWizard("model")} disabled={!installed} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
                    <ExternalLink className="h-4 w-4" />
                    Open Hermes model setup
                  </button>
                </div>
                {hermesSetupOutput ? <pre className="max-h-36 overflow-auto rounded-md bg-panel p-3 text-xs leading-5 text-stone-600">{hermesSetupOutput}</pre> : null}
              </div>
            ) : null}

            {stepIndex === 3 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">Check connection</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">After finishing Hermes setup/auth, verify the current provider and model before starting real work.</p>
                </div>
                <div className="rounded-md border border-line bg-panel p-4 text-sm leading-6 text-stone-700">
                  <p><span className="font-semibold text-ink">Provider:</span> {selectedProvider.label}</p>
                  <p><span className="font-semibold text-ink">Model:</span> {hermesConnection.modelName || "Not set"}</p>
                  <p><span className="font-semibold text-ink">Auth:</span> {isOauth ? "OAuth" : hermesConnection.apiKey ? "API key entered" : "No API key"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={testHermesRuntime} className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-moss">
                    <CheckCircle2 className="h-4 w-4" />
                    {isOauth ? "Check auth status" : "Test connection"}
                  </button>
                  <button onClick={dismissHermesOnboarding} className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-panel">
                    Start QARKO OS
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-line p-4">
          <button onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
            Back
          </button>
          <button onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))} disabled={stepIndex === steps.length - 1} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50">
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
