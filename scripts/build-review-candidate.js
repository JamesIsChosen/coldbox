'use strict';

// Build the interactive review candidate from the immutable approved mock.
// The approved reference remains byte-for-byte unchanged; this candidate is
// intentionally written to ignored build output for supervised UX review.
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const referenceDir = path.join(projectRoot, 'docs/05-development/ui-reference/approved');

function replaceOnce(source, needle, replacement, label) {
  const index = source.indexOf(needle);
  if (index === -1) throw new Error(`Review candidate anchor not found: ${label}`);
  return source.slice(0, index) + replacement + source.slice(index + needle.length);
}

function buildTemplate(template) {
  let result = template;
  const navLabel = '<span style="flex:1 1 auto;text-align:left;font-size:13px">{{ it.label }}</span>';
  if (result.includes(navLabel)) {
    result = replaceOnce(
      result,
      navLabel,
      '<span class="bang" style="flex:1 1 auto;text-align:left;font-size:13px">{{ it.label }}</span>',
      'comic navigation labels'
    );
  }
  const librariesHeader = '<button sc-camel-on-click="{{ goVault }}" class="bang" style="padding:8px 14px;border:3px solid #000;border-radius:6px;background:#fffdf5;box-shadow:4px 4px 0 #000;color:#121212;font-size:16px;cursor:pointer;min-height:44px">◌ Libraries</button>';
  if (result.includes(librariesHeader)) {
    result = replaceOnce(result, librariesHeader, librariesHeader.replace('{{ goVault }}', '{{ goLibraries }}'), 'libraries header route');
  }
  const mobileMoreBackdrop = '<div sc-camel-on-click="{{ closeMore }}" style="position:absolute;inset:0;z-index:5;background:rgba(18,18,18,.6)"></div>';
  if (result.includes(mobileMoreBackdrop)) {
    result = replaceOnce(
      result,
      mobileMoreBackdrop,
      '<div sc-camel-on-click="{{ closeMore }}" style="position:fixed;inset:0;z-index:40;background:rgba(18,18,18,.6)"></div>',
      'mobile popup backdrop'
    );
    result = replaceOnce(
      result,
      '<div class="scroll" style="position:absolute;z-index:6;left:12px;right:12px;bottom:88px;max-height:560px;overflow-y:auto;padding:15px 15px 16px;border:3.5px solid #121212;border-radius:16px;background:#fffdf5;box-shadow:7px 7px 0 #000;color:#121212">',
      '<div class="scroll" style="position:fixed;z-index:41;left:50%;top:84px;transform:translateX(-50%);width:calc(100vw - 24px);max-width:520px;max-height:calc(100vh - 130px);overflow-y:auto;padding:17px 18px;border:3.5px solid #121212;border-radius:16px;background:#fffdf5;box-shadow:9px 9px 0 #000;color:#121212">',
      'mobile popup panel'
    );
  }
  const stateNeedle = "flowMulti: {}, flowCounts: null, entropyMsg: '', entropyLast: 0";
  const mobileStateNeedle = "flowMulti: {}, flowCounts: null, entropyMsg: '', cardFilter: 0";
  const stateReplacement = "flowMulti: {}, flowCounts: null, entropyMsg: '', entropyLast: 0, theme: 'dark', recoverySaved: false, recoverySaveMessage: '',\n    flowInputs: {}, flowPassphrase: '', flowPassphraseConfirm: '', flowPassphraseStatus: '',\n    flowThreshold: { threshold: '3', total: '5' }, flowCustomRange: { start: '120', end: '129' }";
  if (result.includes(stateNeedle)) result = replaceOnce(result, stateNeedle, stateReplacement, 'state extensions');
  else result = replaceOnce(result, mobileStateNeedle, stateReplacement.replace(', entropyLast: 0', ', cardFilter: 0'), 'state extensions');

  const interactionAnchor = "  // Per-option overrides for the steps whose meaning changes with the choice:\n  // 'flowId:stepIndex' -> [ [bodyOverride|null, monoOverride|null, rowsOverride|null], ... ]\n";
  const interactionFallback = "  WALLETS = [";
  const interactionMethods = `  setFlowInput(key, value) {
    const next = Object.assign({}, this.state.flowInputs || {});
    next[key] = value;
    this.setState({ flowInputs: next });
  }

  addEntropy(i) {
    const key = 'entropy:' + i;
    const raw = String((this.state.flowInputs || {})[key] || '').trim();
    const source = this.MULTI['entropy:1'][i];
    let count = 0;
    if (i === 0) count = (raw.match(/[1-6]/g) || []).length;
    else if (i === 1) count = (raw.toUpperCase().match(/[HT]/g) || []).length;
    else if (i === 2) count = raw ? raw.split(/[\\s,]+/).filter(Boolean).length : 0;
    else if (i === 3) count = (raw.match(/[0-9a-f]/gi) || []).length;
    else if (i === 4) count = /^\\d+$/.test(raw) ? Number(raw) : 0;
    const valid = i === 4 ? count > 0 && count <= 256 : count > 0;
    if (!valid) {
      this.setState({ entropyMsg: 'Enter a valid ' + source[0].toLowerCase() + ' value before adding it.' });
      return;
    }
    const counts = Object.assign({}, this.entropyCounts());
    counts[i] = (counts[i] || 0) + count;
    this.setFlowInput(key, '');
    this.setState({ flowCounts: counts, entropyMsg: 'Added ' + count + ' ' + source[2] + (count === 1 ? '' : 's') + ' to ' + source[0] + '.' });
  }

  applyForgePassphrase() {
    const passphrase = String(this.state.flowPassphrase || '');
    const confirmation = String(this.state.flowPassphraseConfirm || '');
    if (passphrase !== confirmation) {
      this.setState({ flowPassphraseStatus: 'Passphrases do not match. The release remains blocked.' });
      return;
    }
    this.setState({ flowPassphraseStatus: passphrase ? 'Passphrase accepted for this review path; it is never stored in the record.' : 'No passphrase selected. The seed uses the empty BIP-39 passphrase.' });
  }

  setForgePassphrase(field, value) {
    const patch = {};
    patch[field] = value;
    this.setState(patch);
  }

  applyThreshold() {
    const threshold = Number(this.state.flowThreshold && this.state.flowThreshold.threshold);
    const total = Number(this.state.flowThreshold && this.state.flowThreshold.total);
    if (!Number.isInteger(threshold) || !Number.isInteger(total) || threshold < 2 || total < threshold || total > 31) {
      this.setState({ entropyMsg: 'Threshold must be an integer from 2 through total, with total no greater than 31.' });
      return;
    }
    this.setState({ entropyMsg: 'Custom split threshold applied: ' + threshold + ' of ' + total + '.' });
  }

  setThresholdField(field, value) {
    const next = Object.assign({}, this.state.flowThreshold || {});
    next[field] = value;
    this.setState({ flowThreshold: next });
  }

  applyCustomRange() {
    const start = Number(this.state.flowCustomRange && this.state.flowCustomRange.start);
    const end = Number(this.state.flowCustomRange && this.state.flowCustomRange.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end - start > 999) {
      this.setState({ entropyMsg: 'Enter whole-number indices from 0 through 999 with the end at or after the start.' });
      return;
    }
    this.setState({ entropyMsg: 'Custom address range applied: ' + start + ' – ' + end + '.' });
  }

  setCustomRangeField(field, value) {
    const next = Object.assign({}, this.state.flowCustomRange || {});
    next[field] = value;
    this.setState({ flowCustomRange: next });
  }

  // Per-option overrides for the steps whose meaning changes with the choice:
  // 'flowId:stepIndex' -> [ [bodyOverride|null, monoOverride|null, rowsOverride|null], ... ]
`;
  if (result.includes(interactionAnchor)) result = replaceOnce(result, interactionAnchor, interactionMethods, 'interaction methods');
  else result = replaceOnce(result, interactionFallback, interactionMethods + '\n  WALLETS = [', 'interaction methods');

  const uxMethodsNeedle = "  go(screen, extra) { this.setState(Object.assign({ screen: screen, pop: null, flowStep: 0 }, extra || {})); }\n";
  const uxMethods = `  go(screen, extra) { this.setState(Object.assign({ screen: screen, pop: null, flowStep: 0 }, extra || {})); }

  setTheme(theme) { this.setState({ theme: theme, themeMessage: theme === 'light' ? 'Light theme selected for the warm shell.' : 'Dark theme selected for the warm shell.' }); }

  saveRecoveryCheckpoint() {
    this.setState({ recoverySaved: true, recoverySaveMessage: 'Checkpoint saved locally. You can leave this flow and resume from the same search position.' });
  }

  resumeRecoveryCheckpoint() {
    this.setState({ recoverySaveMessage: this.state.recoverySaved ? 'Checkpoint restored. Search remains paused until you choose Run search.' : 'No saved checkpoint exists yet.' });
  }

`;
  if (result.includes(uxMethodsNeedle)) result = replaceOnce(result, uxMethodsNeedle, uxMethods, 'theme interaction methods');

  result = replaceOnce(
    result,
    "    const pickOpt = (i) => () => { const next = {}; for (const k in (s.flowOpt || {})) next[k] = s.flowOpt[k]; next[optKey] = i; this.setState({ flowOpt: next }); };\n",
    `    const pickOpt = (i) => () => {
      const next = {}; for (const k in (s.flowOpt || {})) next[k] = s.flowOpt[k]; next[optKey] = i;
      const patch = { flowOpt: next };
      if (flow && flow[0] === 'shares' && optKey === 'shares:1') {
        const preset = [['2', '3'], ['3', '5'], ['4', '7']][i];
        if (preset) patch.flowThreshold = { threshold: preset[0], total: preset[1] };
      }
      this.setState(patch);
    };
    const flowHasEntropyInputs = !!(flow && flow[0] === 'entropy' && flowStepIndex === 2);
    const entropyInputSel = (s.flowMulti && s.flowMulti['entropy:1']) ? s.flowMulti['entropy:1'] : [0];
    const entropyInputSpecs = flowHasEntropyInputs ? entropyInputSel.map((i) => {
      const source = this.MULTI['entropy:1'][i];
      return {
        label: source[0], value: (s.flowInputs || {})['entropy:' + i] || '',
        placeholder: i === 0 ? '1 2 6 4' : i === 1 ? 'H T H T' : i === 2 ? 'A♠, 7♦, K♣' : i === 3 ? 'a5f30c1e' : '32',
        help: i === 0 ? 'Faces 1–6' : i === 1 ? 'Heads or tails' : i === 2 ? 'One card per token' : i === 3 ? 'Digits 0–f' : 'Fresh bytes to draw',
        input: (e) => this.setFlowInput('entropy:' + i, e.target.value),
        add: () => this.addEntropy(i)
      };
    }) : [];
    const flowHasPassphraseInput = !!(flow && flow[0] === 'forge' && flowStepIndex === 3);
    const flowHasThresholdInputs = !!(flow && flow[0] === 'shares' && flowStepIndex === 1);
    const flowHasCustomRangeInputs = !!(flow && flow[0] === 'addresses' && flowStepIndex === 0 && optIdx === 2);
    const flowHasRecoverySave = !!(flow && flow[0] === 'recovery' && flowStepIndex === 2);
    const setFlowRows = (rows) => { if (typeof stepRows !== 'undefined') stepRows = rows; else fRows = rows; };
    if (flowHasThresholdInputs) {
      const threshold = Number((s.flowThreshold || {}).threshold) || 3;
      const total = Number((s.flowThreshold || {}).total) || 5;
      setFlowRows([['Threshold', String(threshold)], ['Total', String(total)], ['Holders', 'custom placement list'], ['Constraint', threshold + ' of ' + total + ' required to recover']]);
    }
    if (flowHasCustomRangeInputs) {
      const start = Number((s.flowCustomRange || {}).start);
      const end = Number((s.flowCustomRange || {}).end);
      if (Number.isInteger(start) && Number.isInteger(end) && end >= start) {
        setFlowRows([['Branch', 'receive'], ['Indices', start + ' – ' + end], ['Purpose', 'gap audit'], ['Found', 'nothing beyond index 6']]);
      }
    }
` ,
    'flow interaction values'
  );

  result = replaceOnce(
    result,
    "      flowPrev: () => this.setState({ flowStep: Math.max(0, flowStepIndex - 1) }),\n      flowNext: () => this.setState({ flowStep: Math.min(flow ? flow[8].length - 1 : 0, flowStepIndex + 1) }),\n",
    `      flowPrev: () => this.setState({ flowStep: Math.max(0, flowStepIndex - 1) }),
      flowNext: () => {
        if (!flow || flowStepIndex < flow[8].length - 1) {
          this.setState({ flowStep: Math.min(flow ? flow[8].length - 1 : 0, flowStepIndex + 1) });
          return;
        }
        const terminal = { forge: 'flow:shares', entropy: 'flow:forge', passphrase: 'seeds', notes: 'seeds' }[flow[0]];
        if (terminal) this.go(terminal, { flowStep: 0 });
        else this.setState({ entropyMsg: 'This flow is complete. Choose a contextual destination to continue.' });
      },
      flowHasEntropyInputs,
      flowEntropyInputs: entropyInputSpecs,
      flowPassphraseInput: flowHasPassphraseInput,
      flowPassphrase: s.flowPassphrase || '',
      flowPassphraseConfirm: s.flowPassphraseConfirm || '',
      flowPassphraseStatus: s.flowPassphraseStatus || 'Enter and confirm the optional passphrase before continuing.',
      setPassphraseEvent: (e) => this.setForgePassphrase('flowPassphrase', e.target.value),
      setPassphraseConfirmEvent: (e) => this.setForgePassphrase('flowPassphraseConfirm', e.target.value),
      applyPassphrase: () => this.applyForgePassphrase(),
      flowHasThresholdInputs,
      flowThreshold: s.flowThreshold || { threshold: '3', total: '5' },
      setThresholdEvent: (e) => this.setThresholdField('threshold', e.target.value),
      setThresholdTotalEvent: (e) => this.setThresholdField('total', e.target.value),
      applyThreshold: () => this.applyThreshold(),
      flowHasCustomRangeInputs,
      flowCustomRange: s.flowCustomRange || { start: '120', end: '129' },
      setCustomRangeStartEvent: (e) => this.setCustomRangeField('start', e.target.value),
      setCustomRangeEndEvent: (e) => this.setCustomRangeField('end', e.target.value),
      applyCustomRange: () => this.applyCustomRange(),
      flowHasRecoverySave,
      recoverySaved: !!s.recoverySaved,
      recoverySaveMessage: s.recoverySaveMessage || 'No checkpoint saved yet. Save before leaving a long search.',
      saveRecoveryCheckpoint: () => this.saveRecoveryCheckpoint(),
      resumeRecoveryCheckpoint: () => this.resumeRecoveryCheckpoint(),
      flowMessage: s.entropyMsg || '',
`,
    'flow navigation and control bindings'
  );

  result = replaceOnce(
    result,
    `<sc-if value="{{ flowHasControls }}" hint-placeholder-val="{{ false }}">`,
    `<sc-if value="{{ flowHasEntropyInputs }}" hint-placeholder-val="{{ false }}">
              <div style="margin-top:15px;padding:12px;border:3px solid #121212;border-radius:7px;background:#fff2f7;color:#121212">
                <span class="bang" style="font-size:16px">Enter each selected source</span>
                <sc-for list="{{ flowEntropyInputs }}" as="e" hint-placeholder-count="5">
                  <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:end;margin-top:10px">
                    <label style="display:flex;flex-direction:column;gap:4px;font-size:12px">{{ e.label }} · {{ e.help }}<input type="text" value="{{ e.value }}" placeholder="{{ e.placeholder }}" sc-camel-on-input="{{ e.input }}" style="min-height:44px;padding:8px;border:2px solid #121212;border-radius:5px;background:#fff;color:#121212"></label>
                    <button sc-camel-on-click="{{ e.add }}" class="bang" style="padding:8px 12px;border:2px solid #121212;border-radius:5px;background:#ffde59;box-shadow:3px 3px 0 #121212;color:#121212;cursor:pointer;min-height:44px">Add {{ e.label }}</button>
                  </div>
                </sc-for>
                <p style="margin:9px 0 0;font-size:11.5px;line-height:1.5">{{ flowMessage }}</p>
              </div>
            </sc-if>

            <sc-if value="{{ flowPassphraseInput }}" hint-placeholder-val="{{ false }}">
              <div style="margin-top:15px;padding:12px;border:3px solid #121212;border-radius:7px;background:#fff2f7;color:#121212">
                <span class="bang" style="font-size:16px">Add a BIP-39 passphrase</span>
                <label style="display:flex;flex-direction:column;gap:4px;margin-top:9px;font-size:12px">Passphrase (optional)<input type="password" value="{{ flowPassphrase }}" autocomplete="new-password" sc-camel-on-input="{{ setPassphraseEvent }}" style="min-height:44px;padding:8px;border:2px solid #121212;border-radius:5px;background:#fff;color:#121212"></label>
                <label style="display:flex;flex-direction:column;gap:4px;margin-top:9px;font-size:12px">Confirm passphrase<input type="password" value="{{ flowPassphraseConfirm }}" autocomplete="new-password" sc-camel-on-input="{{ setPassphraseConfirmEvent }}" style="min-height:44px;padding:8px;border:2px solid #121212;border-radius:5px;background:#fff;color:#121212"></label>
                <button sc-camel-on-click="{{ applyPassphrase }}" class="bang" style="margin-top:10px;padding:8px 12px;border:2px solid #121212;border-radius:5px;background:#ffde59;box-shadow:3px 3px 0 #121212;color:#121212;cursor:pointer;min-height:44px">Use passphrase</button>
                <p style="margin:9px 0 0;font-size:11.5px;line-height:1.5">{{ flowPassphraseStatus }}</p>
              </div>
            </sc-if>

            <sc-if value="{{ flowHasThresholdInputs }}" hint-placeholder-val="{{ false }}">
              <div style="margin-top:15px;padding:12px;border:3px solid #121212;border-radius:7px;background:#e8f9ff;color:#121212">
                <span class="bang" style="font-size:16px">Choose any threshold</span>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px">
                  <label style="display:flex;flex-direction:column;gap:4px;font-size:12px">Shares required<input type="number" min="2" max="31" value="{{ flowThreshold.threshold }}" sc-camel-on-input="{{ setThresholdEvent }}" style="min-height:44px;padding:8px;border:2px solid #121212;border-radius:5px"></label>
                  <label style="display:flex;flex-direction:column;gap:4px;font-size:12px">Total shares<input type="number" min="2" max="31" value="{{ flowThreshold.total }}" sc-camel-on-input="{{ setThresholdTotalEvent }}" style="min-height:44px;padding:8px;border:2px solid #121212;border-radius:5px"></label>
                </div>
                <button sc-camel-on-click="{{ applyThreshold }}" class="bang" style="margin-top:10px;padding:8px 12px;border:2px solid #121212;border-radius:5px;background:#00f0ff;box-shadow:3px 3px 0 #121212;color:#121212;cursor:pointer;min-height:44px">Apply threshold</button>
                <p style="margin:9px 0 0;font-size:11.5px;line-height:1.5">{{ flowMessage }}</p>
              </div>
            </sc-if>

            <sc-if value="{{ flowHasCustomRangeInputs }}" hint-placeholder-val="{{ false }}">
              <div style="margin-top:15px;padding:12px;border:3px solid #121212;border-radius:7px;background:#e8f9ff;color:#121212">
                <span class="bang" style="font-size:16px">Enter a custom index range</span>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px">
                  <label style="display:flex;flex-direction:column;gap:4px;font-size:12px">Start index<input type="number" min="0" max="999" value="{{ flowCustomRange.start }}" sc-camel-on-input="{{ setCustomRangeStartEvent }}" style="min-height:44px;padding:8px;border:2px solid #121212;border-radius:5px"></label>
                  <label style="display:flex;flex-direction:column;gap:4px;font-size:12px">End index<input type="number" min="0" max="999" value="{{ flowCustomRange.end }}" sc-camel-on-input="{{ setCustomRangeEndEvent }}" style="min-height:44px;padding:8px;border:2px solid #121212;border-radius:5px"></label>
                </div>
                <button sc-camel-on-click="{{ applyCustomRange }}" class="bang" style="margin-top:10px;padding:8px 12px;border:2px solid #121212;border-radius:5px;background:#00f0ff;box-shadow:3px 3px 0 #121212;color:#121212;cursor:pointer;min-height:44px">Apply range</button>
                <p style="margin:9px 0 0;font-size:11.5px;line-height:1.5">{{ flowMessage }}</p>
              </div>
            </sc-if>

            <sc-if value="{{ flowHasRecoverySave }}" hint-placeholder-val="{{ false }}">
              <div style="margin-top:15px;padding:12px;border:3px solid #121212;border-radius:7px;background:#fff2f7;color:#121212">
                <span class="bang" style="font-size:16px">Save a long-running recovery</span>
                <p style="margin:7px 0 0;font-size:11.5px;line-height:1.5">A checkpoint records the current search position locally so you can leave this screen and come back without pretending the search finished.</p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                  <button sc-camel-on-click="{{ saveRecoveryCheckpoint }}" class="bang" style="padding:8px 12px;border:2px solid #121212;border-radius:5px;background:#ffde59;box-shadow:3px 3px 0 #121212;color:#121212;cursor:pointer;min-height:44px">Save checkpoint</button>
                  <button sc-camel-on-click="{{ resumeRecoveryCheckpoint }}" class="bang" style="padding:8px 12px;border:2px solid #121212;border-radius:5px;background:#00f0ff;box-shadow:3px 3px 0 #121212;color:#121212;cursor:pointer;min-height:44px">Resume saved search</button>
                </div>
                <p class="mono" style="margin:9px 0 0;font-size:10.5px">{{ recoverySaveMessage }}</p>
              </div>
            </sc-if>

<sc-if value="{{ flowHasControls }}" hint-placeholder-val="{{ false }}">`,
    'flow control panel'
  );

  const librariesAnchor = `      <sc-if value="{{ isVault }}" hint-placeholder-val="{{ false }}">`;
  if (result.includes(librariesAnchor)) {
    result = replaceOnce(result, librariesAnchor, `      <sc-if value="{{ isLibraries }}" hint-placeholder-val="{{ false }}">
      <div style="margin-top:22px">
        <div style="padding:15px 17px;border:3px solid #121212;border-radius:9px;background:#fffdf5;box-shadow:7px 7px 0 #000;color:#121212">
          <span class="bang" style="display:inline-block;padding:2px 9px;border:2px solid #000;background:#00f0ff;box-shadow:2px 2px 0 #000;color:#121212;font-size:13px">Offline library inventory</span>
          <p style="margin:11px 0 0;font-size:12.5px;line-height:1.6;color:#5c5344">This is the complete dependency inventory for the review candidate: shipped runtime packages, inline reference implementations, bundled fonts and data, plus development-only tooling. Each entry has one job, one version or provenance label, and one boundary.</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:16px">
          <sc-for list="{{ libraryGroups }}" as="g" hint-placeholder-count="6">
            <div style="padding:15px 16px;border:3px solid #121212;border-radius:9px;background:#fffdf5;box-shadow:7px 7px 0 #000;color:#121212">
              <span class="bang" style="display:inline-block;padding:2px 9px;border:2px solid #000;background:{{ g.badgeBg }};box-shadow:2px 2px 0 #000;color:#121212;font-size:13px">{{ g.title }}</span>
              <div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">
                <sc-for list="{{ g.items }}" as="l" hint-placeholder-count="8">
                  <div style="padding:9px 10px;border:2px solid #121212;border-radius:6px;background:#f2f6ff">
                    <div style="display:flex;align-items:baseline;gap:8px"><span class="bang" style="font-size:16px">{{ l.name }}</span><span class="mono" style="margin-left:auto;font-size:10.5px;color:#0f6b45">{{ l.version }}</span></div>
                    <p style="margin:5px 0 0;font-size:11.5px;line-height:1.45;color:#5c5344">{{ l.role }}</p>
                    <span class="mono" style="display:block;margin-top:5px;font-size:10px;color:#0f6b45">{{ l.status }}</span>
                  </div>
                </sc-for>
              </div>
            </div>
          </sc-for>
        </div>
      </div>
      </sc-if>

      <sc-if value="{{ isVault }}" hint-placeholder-val="{{ false }}">`, 'libraries screen');
  }

  const screenAnchor = `      vault: ['warm', '#00f0ff', 'Vault / settings', 'Vault & settings', 'Vault files, their KDF profiles and save state, plus creation, theme and session settings.', ['1 unlocked · 1 locked', '#4ade80'], 'One canonical .cbx per vault ID (ADR-0026). Base64 is an advanced handoff; animated QR is live transfer only.'],`;
  if (result.includes(screenAnchor)) {
    result = replaceOnce(result, screenAnchor, `      libraries: ['warm', '#00f0ff', 'Reference / runtime', 'Libraries', 'Complete inventory of runtime packages, inline references, fonts, data files and development tooling.', ['Inventory · complete', '#4ade80'], 'Every dependency has an explicit owner and boundary; development-only tools are labeled so this screen is not mistaken for shipped runtime.'],
${screenAnchor}`, 'libraries screen descriptor');
  }

  const navHandlerAnchor = `      goHome: () => this.go('home'), goVault: () => this.go('vault'), goLock: () => this.go('lock'),`;
  if (result.includes(navHandlerAnchor)) {
    result = replaceOnce(result, navHandlerAnchor, `      goHome: () => this.go('home'), goVault: () => this.go('vault'), goLibraries: () => this.go('libraries'), goLock: () => this.go('lock'),`, 'libraries handler');
  }
  const createHandlerAnchor = `      goSecurity: () => this.go('security'), goCreate: () => this.go('create'), goAdvanced: () => this.go('advanced'),`;
  if (result.includes(createHandlerAnchor)) {
    result = replaceOnce(result, createHandlerAnchor, `      goSecurity: () => this.go('security'), goCreate: () => this.go('create', { createStep: 1 }), goAdvanced: () => this.go('advanced'),`, 'reset vault flow start');
  }
  result = result.replaceAll("this.go('create')", "this.go('create', { createStep: 1 })");
  const walletOpenAnchor = `        const open = () => this.go('walletDetail', { walletId: w.id, walletTab: 'overview' });`;
  if (result.includes(walletOpenAnchor)) {
    result = replaceOnce(result, walletOpenAnchor, `        const open = () => this.openPop({
          badge: 'Wallet record', badgeBg: '#00f0ff', title: w.name,
          body: 'This wallet opens as a record menu so its identity, lineage and available next actions stay together instead of sending you to an unrelated detail page.',
          rows: [['Type', w.type], ['Balance', w.balance], ['Addresses', String(w.addrs)], ['Mode', w.mode], ['Seed lineage', ws ? ws.label + ' · fp ' + ws.fp : 'imported xpub · no seed']],
          qr: null, send: [['Wallet detail', 'walletDetail:' + w.id], ['Portfolio & records', 'portfolio'], ['Backup & recovery', 'backup']],
          foot: 'Public wallet metadata only. Secret authority remains in the sealed realm.'
        });`, 'wallet floating menu');
  }
  const isVaultAnchor = `      isVault: s.screen === 'vault',`;
  if (result.includes(isVaultAnchor)) {
    result = replaceOnce(result, isVaultAnchor, `      isVault: s.screen === 'vault',
      isLibraries: s.screen === 'libraries',
      isBackupScreen: s.screen === 'backup',`, 'screen bindings');
  }
  const flowHandlersAnchor = `      goDescriptors: () => this.go('advanced', { cardFilter: 2 }),`;
  if (result.includes(flowHandlersAnchor)) {
    result = replaceOnce(result, flowHandlersAnchor, `      goDescriptors: () => this.go('advanced', { cardFilter: 2 }),
      openRecovery: () => this.go('flow:recovery', { flowStep: 0 }),`, 'recovery entry handler');
  }

  const libraryDataAnchor = `    // ---------- vault ----------`;
  const securityDataAnchor = `    // ---------- vault ----------`;
  if (result.includes(securityDataAnchor)) {
    result = replaceOnce(result, securityDataAnchor, `    const securityCard = (id, tagBg) => {
      const f = this.FLOWS.filter(x => x[0] === id)[0];
      return { tag: f[3] || f[2], tagBg, title: f[4], note: f[5], ready: (f[11] ? 'roadmap-owned · unavailable in production' : 'available now') + ' · ' + f[8].length + ' steps', readyColor: f[11] ? '#b3261e' : '#0f6b45', style: this.paperCard(0), go: () => this.go('flow:' + id, { flowStep: 0 }) };
    };
    const securityGroups = [
      { title: 'Device & address checks', badgeBg: '#ffde59', note: 'Confirm signing devices and derive addresses before they are used.', items: [securityCard('devices', '#ffde59'), securityCard('addresses', '#e8f9ff')] },
      { title: 'Recovery health', badgeBg: '#4ade80', note: 'Check whether backup sets have actually been reconstructed and verified.', items: [securityCard('backuphealth', '#4ade80'), securityCard('recovery', '#00f0ff')] },
      { title: 'Trust & provenance', badgeBg: '#00f0ff', note: 'Verify the file you opened, then inspect its provenance and source claims.', items: [securityCard('verifyfile', '#ffde59'), securityCard('provenance', '#00f0ff'), securityCard('source', '#8e8e9c')] }
    ];

    // ---------- vault ----------`, 'security groups data');
  }
  if (result.includes(libraryDataAnchor)) {
    result = replaceOnce(result, libraryDataAnchor, `    const libraryGroups = [
      { title: 'Cryptography', badgeBg: '#ffde59', items: [
        { name: '@noble/hashes', version: '2.2.0', role: 'SHA-2/3, HMAC, PBKDF2, RIPEMD-160 and Keccak primitives.', status: 'vendored · offline only' },
        { name: '@noble/curves', version: '2.2.0', role: 'secp256k1 and ed25519 elliptic-curve operations.', status: 'vendored · offline only' },
        { name: '@noble/ciphers', version: '2.2.0', role: 'AES-GCM and ChaCha20-Poly1305 authenticated encryption.', status: 'vendored · offline only' },
        { name: 'argon2-browser (WASM)', version: '1.18.0', role: 'Argon2id KDF for local vault credential work.', status: 'WASM · local execution' }
      ]},
      { title: 'Encoding & recovery', badgeBg: '#00f0ff', items: [
        { name: '@scure/bip32', version: '2.2.0', role: 'BIP-32 hierarchical deterministic derivation.', status: 'vendored · offline only' },
        { name: '@scure/bip39', version: '2.2.0', role: 'Mnemonic encoding and decoding.', status: 'vendored · offline only' },
        { name: '@scure/base', version: '2.2.0', role: 'Base58, bech32, bech32m and base64 encodings.', status: 'vendored · offline only' },
        { name: 'SLIP-39 implementation', version: '0.1.9-adapted', role: 'Shamir mnemonic shares for split and recovery.', status: 'inline adaptation · no network' },
        { name: 'Shamir39 reference', version: 'commit-pinned', role: 'Reviewed reference behavior for split and recovery flows.', status: 'inline adaptation · provenance reference' },
        { name: 'codex32 implementation', version: 'BIP-93 inline', role: 'Hand-verifiable checksum, master-seed encoding and GF(32) shares.', status: 'inline standard adaptation' },
        { name: 'Seed XOR implementation', version: 'inline', role: 'Coldcard-compatible BIP-39 entropy XOR.', status: 'inline · no runtime package' },
        { name: 'secrets.js reference', version: 'commit-pinned', role: 'Raw secret-sharing reference behavior.', status: 'inline adaptation · provenance reference' }
      ]},
      { title: 'QR & camera', badgeBg: '#ff4f9a', items: [
        { name: 'qrcode-generator', version: '1.4.4', role: 'Ephemeral SVG/data-URL rendering for live public transfer frames.', status: 'vendored · offline only' },
        { name: 'jsQR', version: 'TBD', role: 'Optional camera decoding for recovery workflows.', status: 'optional · not runtime-ready' }
      ]},
      { title: 'Fonts', badgeBg: '#4ade80', items: [
        { name: '@fontsource/bangers', version: '5.3.0', role: 'Bangers display face for headings and comic labels.', status: 'vendored · inlined data URI' },
        { name: '@fontsource/comic-neue', version: '5.3.0', role: 'Comic Neue 400/700 body faces.', status: 'vendored · inlined data URI' }
      ]},
      { title: 'Data files', badgeBg: '#e8f9ff', items: [
        { name: 'BIP-39 wordlists', version: '10 languages', role: 'Mnemonic wordlists used by encoding and recovery.', status: 'embedded · hash verified' },
        { name: 'SLIP-39 wordlist', version: '1024 words', role: 'Shamir mnemonic wordlist.', status: 'embedded · hash verified' },
        { name: 'EFF Large', version: '7776 words', role: 'Large passphrase generation wordlist.', status: 'embedded · hash verified' },
        { name: 'EFF Short 2.0', version: '1296 words', role: 'Short passphrase generation wordlist.', status: 'embedded · hash verified' },
        { name: 'SLIP-44 coin type subset', version: 'pinned subset', role: 'Coin-type labels for derivation and address records.', status: 'embedded · hash verified' }
      ]},
      { title: 'Development tooling', badgeBg: '#8e8e9c', items: [
        { name: 'Build script', version: 'repository', role: 'Assembly, CSP hashing and help compilation.', status: 'dev-only · never shipped' },
        { name: 'Test runner', version: 'repository', role: 'Unit and vector test execution.', status: 'dev-only · never shipped' },
        { name: 'Linter', version: 'repository', role: 'Forbidden-construct enforcement.', status: 'dev-only · never shipped' },
        { name: 'Vendor verifier', version: 'repository', role: 'Upstream hash comparison for pinned artifacts.', status: 'dev-only · networked check' },
        { name: 'Playwright', version: '1.62.1', role: 'Headless browser checks for CSP, sandbox and realm boundaries.', status: 'dev-only · never shipped' },
        { name: 'Playwright browser binaries', version: 'Chromium + Firefox', role: 'Installed harness browsers used by the boundary checks.', status: 'dev-only · never shipped' }
      ]}
    ];

    // ---------- vault ----------`, 'library inventory data');
  }

  const returnCardAnchor = `      cardFilters, gridCards, cardsNote,
      vaultFiles,`;
  if (result.includes(returnCardAnchor)) {
    result = replaceOnce(result, returnCardAnchor, `      cardFilters, gridCards, cardsNote,
      securityGroups,
      libraryGroups,
      themeMessage: s.themeMessage || 'Dark theme selected for the warm shell.',
      setThemeDark: () => this.setTheme('dark'), setThemeLight: () => this.setTheme('light'),
      themeDarkStyle: 'flex:1 1 0;padding:11px;border:3px solid ' + (s.theme === 'dark' ? '#00f0ff' : '#f4f0e2') + ';border-radius:8px;background:#1a1a24;cursor:pointer;text-align:left;box-shadow:' + (s.theme === 'dark' ? '4px 4px 0 #00f0ff' : 'none'),
      themeLightStyle: 'flex:1 1 0;padding:11px;border:3px solid ' + (s.theme === 'light' ? '#00f0ff' : '#121212') + ';border-radius:8px;background:#ece2cf;cursor:pointer;text-align:left;box-shadow:' + (s.theme === 'light' ? '4px 4px 0 #00f0ff' : 'none'),
      vaultFiles,`, 'library and theme bindings');
  }
  const popSendAnchor = `      popSend: pop && pop.send ? pop.send.map(a => ({ label: a[0], go: () => this.go(a[1]) })) : [],`;
  if (result.includes(popSendAnchor)) {
    result = replaceOnce(result, popSendAnchor, `      popSend: pop && pop.send ? pop.send.map(a => ({ label: a[0], go: () => { const parts = String(a[1]).split(':'); return this.go(parts[0], parts[0] === 'walletDetail' ? { walletId: parts[1] || 'w1', walletTab: 'overview' } : {}); } })) : [],`, 'wallet popup destinations');
  }

  const cardsAnchor = `      <sc-if value="{{ isCards }}" hint-placeholder-val="{{ false }}">`;
  if (result.includes(cardsAnchor)) {
    result = replaceOnce(result, cardsAnchor, `      <sc-if value="{{ isSecurity }}" hint-placeholder-val="{{ false }}">
      <div style="margin-top:22px">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">
          <sc-for list="{{ securityGroups }}" as="g" hint-placeholder-count="3">
            <div style="padding:15px 16px;border:3px solid #121212;border-radius:9px;background:#fffdf5;box-shadow:7px 7px 0 #000;color:#121212">
              <span class="bang" style="display:inline-block;padding:2px 9px;border:2px solid #000;background:{{ g.badgeBg }};box-shadow:2px 2px 0 #000;color:#121212;font-size:13px">{{ g.title }}</span>
              <p style="margin:8px 0 0;font-size:11.5px;line-height:1.5;color:#5c5344">{{ g.note }}</p>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:11px">
                <sc-for list="{{ g.items }}" as="c" hint-placeholder-count="3">
                  <button sc-camel-on-click="{{ c.go }}" style="{{ c.style }}">
                    <div style="display:flex;align-items:center;gap:8px"><span class="mono" style="padding:2px 7px;border:2px solid #121212;background:{{ c.tagBg }};color:#121212;font-size:10.5px">{{ c.tag }}</span><span class="bang" style="font-size:17px;color:#121212;text-align:left">{{ c.title }}</span></div>
                    <p style="margin:7px 0 0;font-size:11.5px;line-height:1.45;color:#5c5344;text-align:left">{{ c.note }}</p>
                    <span class="mono" style="display:block;margin-top:7px;padding-top:6px;border-top:2px dashed #b9b0a0;font-size:10.5px;color:{{ c.readyColor }};text-align:left">{{ c.ready }}</span>
                  </button>
                </sc-for>
              </div>
            </div>
          </sc-for>
        </div>
        <p style="margin:14px 0 0;max-width:56rem;color:#b3bcd4;font-size:12.5px;line-height:1.6">Security facts are grouped by the decision they support: inspect devices and addresses, check recovery health, then verify files and provenance. Source &amp; transport remains a separate roadmap item.</p>
      </div>
      </sc-if>

${cardsAnchor}`, 'security groups');
    result = result.replace("isCards: s.screen === 'advanced' || s.screen === 'reference' || s.screen === 'security',", "isCards: s.screen === 'advanced' || s.screen === 'reference',\n      isSecurity: s.screen === 'security',");
  }

  const advancedFilters = `      cardFilters = filterBtn(['Every flow', 'Sealed realm', 'Warm shell', 'Roadmap-owned'], s.cardFilter, (i) => this.setState({ cardFilter: i }));`;
  if (result.includes(advancedFilters)) {
    result = replaceOnce(result, advancedFilters, `      cardFilters = filterBtn(['Every flow', 'Forge', 'Derive', 'Split & carry', 'Recover & verify', 'Records', 'Vault & session', 'Trust & reference', 'Roadmap-owned'], s.cardFilter, (i) => this.setState({ cardFilter: i }));`, 'flow family filters');
    const advancedSrc = `      const src = this.FLOWS.filter(f => s.cardFilter === 0 || (s.cardFilter === 1 ? f[1] === 'cold' : s.cardFilter === 2 ? f[1] === 'warm' : !!f[11]));`;
    if (result.includes(advancedSrc)) result = replaceOnce(result, advancedSrc, `      const flowFamily = (f) => {
        if (f[11]) return 'Roadmap-owned';
        const id = f[0];
        if (['entropy', 'forge', 'passphrase', 'notes'].indexOf(id) >= 0) return 'Forge';
        if (['paths', 'addresses', 'children', 'descriptors'].indexOf(id) >= 0) return 'Derive';
        if (['shares', 'combine', 'qrstudio'].indexOf(id) >= 0) return 'Split & carry';
        if (['recovery', 'verifybench', 'backuphealth', 'verifyfile'].indexOf(id) >= 0) return 'Recover & verify';
        if (['registry', 'devices', 'prices', 'taxes'].indexOf(id) >= 0) return 'Records';
        if (['unlock', 'transfer', 'settings', 'send', 'signing', 'broadcast', 'psbt', 'coincontrol', 'source'].indexOf(id) >= 0) return 'Vault & session';
        return 'Trust & reference';
      };
      const familyFilters = ['Every flow', 'Forge', 'Derive', 'Split & carry', 'Recover & verify', 'Records', 'Vault & session', 'Trust & reference', 'Roadmap-owned'];
      const src = this.FLOWS.filter(f => s.cardFilter === 0 || flowFamily(f) === familyFilters[s.cardFilter]);`, 'flow family filter logic');
  }
  const cardsNoteAnchor = `      cardsNote = 'One owner per capability: each flow appears exactly once here, and again as an action on the object it acts on. Nothing was retired to build the new hierarchy, and every roadmap-owned flow is designed rather than stubbed.';`;
  if (result.includes(cardsNoteAnchor)) result = replaceOnce(result, cardsNoteAnchor, `      cardsNote = 'Use the family filters to find one bounded job at a time. Each flow has one owner, one entry point and a direct route back to its owning object; roadmap-owned items remain clearly marked.';`, 'organized flow note');

  const warmNavGroup = `      ['Vault & settings', [
        ['vault', 'V', 'Vault files', 'P0.13'],
        ['flow:unlock', '⏻', 'Vault session', 'P0.13'],
        ['flow:transfer', '⇄', 'Device transfer (QR)', 'P0.13'],
        ['flow:settings', '⚙', 'Settings', ''],
        ['advanced', '⊕', 'All flows index', 'all']
      ]],`;
  if (result.includes(warmNavGroup)) {
    result = replaceOnce(result, warmNavGroup, `      ['Vault', [
        ['vault', 'V', 'Vault files', 'P0.13'],
        ['flow:unlock', '⏻', 'Vault session', 'P0.13'],
        ['flow:transfer', '⇄', 'Device transfer (QR)', 'P0.13']
      ]],
      ['Settings & tools', [
        ['flow:settings', '⚙', 'Settings', ''],
        ['advanced', '⊕', 'All flows index', 'all']
      ]],`, 'split vault and settings navigation');
  }

  const vaultGridAnchor = `      <sc-if value="{{ isVault }}" hint-placeholder-val="{{ false }}">
      <div style="margin-top:22px">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">`;
  if (result.includes(vaultGridAnchor)) {
    result = replaceOnce(result, vaultGridAnchor, `      <sc-if value="{{ isVault }}" hint-placeholder-val="{{ false }}">
      <div style="margin-top:22px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="bang" style="display:inline-block;padding:2px 9px;border:2px solid #000;background:#00f0ff;box-shadow:2px 2px 0 #000;color:#121212;font-size:13px">Vault records</span><span class="mono" style="font-size:10.5px;color:#b3bcd4">Save, lock, unlock, rename</span></div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">`, 'vault records grouping');
    result = replaceOnce(result, `        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:16px;align-items:start">`, `        <div style="display:flex;align-items:center;gap:10px;margin-top:16px;margin-bottom:-5px"><span class="bang" style="display:inline-block;padding:2px 9px;border:2px solid #000;background:#ffde59;box-shadow:2px 2px 0 #000;color:#121212;font-size:13px">Start or personalize</span><span class="mono" style="font-size:10.5px;color:#b3bcd4">Create a vault and choose the warm-shell theme</span></div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:16px;align-items:start">`, 'vault settings grouping');
  }

  const themeCards = `            <div style="display:flex;gap:11px;margin-top:12px">
              <div style="flex:1 1 0;padding:11px;border:3px solid #f4f0e2;border-radius:8px;background:#1a1a24">
                <span class="bang" style="font-size:14px;color:#fffdf5">Dark</span>
                <div style="margin-top:8px;padding:8px;border:2px solid #f4f0e2;border-radius:5px;background:#232331">
                  <span class="mono" style="font-size:10px;color:#b3bcd4">--surface #232331</span>
                </div>
              </div>
              <div style="flex:1 1 0;padding:11px;border:3px solid #121212;border-radius:8px;background:#ece2cf">
                <span class="bang" style="font-size:14px;color:#121212">Light</span>
                <div style="margin-top:8px;padding:8px;border:2px solid #121212;border-radius:5px;background:#fffdf5">
                  <span class="mono" style="font-size:10px;color:#5c5344">--surface #fffdf5</span>
                </div>
              </div>
            </div>`;
  if (result.includes(themeCards)) {
    result = replaceOnce(result, themeCards, `            <div style="display:flex;gap:11px;margin-top:12px">
              <button sc-camel-on-click="{{ setThemeDark }}" style="{{ themeDarkStyle }}"><span class="bang" style="font-size:14px;color:#fffdf5">Dark</span><div style="margin-top:8px;padding:8px;border:2px solid #f4f0e2;border-radius:5px;background:#232331"><span class="mono" style="font-size:10px;color:#b3bcd4">--surface #232331</span></div></button>
              <button sc-camel-on-click="{{ setThemeLight }}" style="{{ themeLightStyle }}"><span class="bang" style="font-size:14px;color:#121212">Light</span><div style="margin-top:8px;padding:8px;border:2px solid #121212;border-radius:5px;background:#fffdf5"><span class="mono" style="font-size:10px;color:#5c5344">--surface #fffdf5</span></div></button>
            </div>
            <p class="mono" style="margin:10px 0 0;font-size:10.5px;color:#b3bcd4">{{ themeMessage }}</p>`, 'working theme controls');
  }

  const backupNote = `        <p style="margin:13px 0 0;max-width:56rem;color:#b3bcd4;font-size:12.5px;line-height:1.6">{{ tableNote }}</p>`;
  if (result.includes(backupNote)) {
    result = replaceOnce(result, backupNote, `${backupNote}
        <sc-if value="{{ isBackupScreen }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;padding:12px;border:3px solid #121212;border-radius:8px;background:#e8f9ff;color:#121212;box-shadow:5px 5px 0 #000">
            <div><span class="bang" style="font-size:17px">Recovery is its own flow</span><p style="margin:4px 0 0;font-size:11.5px;line-height:1.45">Choose a seed, check the backup set, then walk through reconstruction in the Recovery Assistant.</p></div>
            <button sc-camel-on-click="{{ openRecovery }}" class="bang" style="margin-left:auto;padding:9px 14px;border:3px solid #121212;border-radius:6px;background:#ffde59;box-shadow:3px 3px 0 #121212;color:#121212;font-size:15px;cursor:pointer;min-height:44px">Open recovery assistant</button>
          </div>
        </sc-if>`, 'backup recovery entry');
  }

  return result;
}

function buildCandidate(referencePath, outputPath) {
  const source = fs.readFileSync(referencePath, 'utf8');
  const marker = '<script type="__bundler/template">';
  const start = source.indexOf(marker);
  const end = source.indexOf('</script>', start);
  if (start === -1 || end === -1) throw new Error('Approved template container not found');
  const jsonStart = start + marker.length;
  const template = JSON.parse(source.slice(jsonStart, end).trim());
  const updated = buildTemplate(template);
  // The template itself contains closing tags. Escape the slash exactly as
  // the bundler does so the outer manifest script is not terminated early.
  const encoded = JSON.stringify(updated).replace(/<\//g, '<\\u002F');
  const output = source.slice(0, jsonStart) + '\n' + encoded + '\n' + source.slice(end);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, 'utf8');
  return outputPath;
}

function main() {
  const outputs = [
    buildCandidate(
      path.join(referenceDir, 'coldbox-workstation-desktop-mockup.html.reference'),
      path.join(projectRoot, 'build', 'coldbox-review.html')
    ),
    buildCandidate(
      path.join(referenceDir, 'coldbox-workstation-mobile-mockup.html.reference'),
      path.join(projectRoot, 'build', 'coldbox-review-mobile.html')
    )
  ];
  process.stdout.write(`${outputs.join('\n')}\n`);
}

main();
