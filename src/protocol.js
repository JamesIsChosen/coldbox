(function (global) {
  'use strict';

  var PROTOCOL_VERSION = 1;
  var PUBLIC_SCHEMA_VERSION = 2;
  var MAX_VAULT_BYTES = 64 * 1024 * 1024;
  var MAX_PUBLIC_PAYLOAD_BYTES = 4 * 1024 * 1024;
  var SECRET_KEYS = Object.freeze({
    mnemonic: true,
    privateKey: true,
    xprv: true,
    passphrase: true,
    secretCompartment: true,
    secretPlaintext: true,
    storedSecret: true,
    shareMaterial: true
  });
  var COLLECTIONS = Object.freeze([
    'seeds',
    'wallets',
    'accounts',
    'addresses',
    'notes',
    'devices',
    'transactions',
    'lots',
    'disposals',
    'basisAllocations',
    'prices',
    'backups',
    'contacts',
    'auditLog'
  ]);
  var SECTIONS = Object.freeze([
    'vault',
    'dashboard',
    'portfolio',
    'prices',
    'registry',
    'devices',
    'entropy',
    'seed-forge',
    'derivation',
    'backup',
    'qr',
    'recovery',
    'verify',
    'reference',
    'learn'
  ]);
  var COLLECTION_SET = makeSet(COLLECTIONS);
  var SECTION_SET = makeSet(SECTIONS);
  var WARNING_CODES = Object.freeze([
    'csp-active',
    'online',
    'offline',
    'airgap-violation',
    'provider-isolation-violation',
    'webcrypto-unavailable',
    'worker-unavailable'
  ]);
  var WARNING_SET = makeSet(WARNING_CODES);
  var DEVICE_STATUS_SET = makeSet([
    'in-use',
    'retired',
    'lost',
    'destroyed',
    'rma'
  ]);
  var ADDRESS_ORIGIN_SET = makeSet(['derived', 'manual', 'imported']);
  var VERIFICATION_STATE_SET = makeSet([
    'unverified',
    'cold-verified',
    'cold-verified-stale',
    'unverifiable'
  ]);
  var BACKUP_METHOD_SET = makeSet([
    'slip39',
    'codex32',
    'seedxor',
    'shamir39',
    'sss',
    'seedqr',
    'metal',
    'paper',
    'encrypted-file'
  ]);
  var BACKUP_VERIFY_OUTCOME_SET = makeSet([
    'verified',
    'invalid',
    'unsupported',
    'no-record',
    'vault-locked'
  ]);
  var KDF_ACTIVE = Object.freeze([
    'argon2id-standard',
    'argon2id-fast',
    'argon2id-paranoid',
    'pbkdf2-sha512-fallback',
    'checking',
    'unknown'
  ]);
  var KDF_ACTIVE_SET = makeSet(KDF_ACTIVE);
  var ERROR_MESSAGES = Object.freeze({
    'invalid-message': 'The cold realm rejected a message.',
    'operation-failed': 'The requested operation failed.',
    'vault-locked': 'The vault is locked.',
    'vault-corrupt': 'The vault could not be authenticated.',
    unsupported: 'The requested operation is unsupported.'
  });

  function makeSet(values) {
    var result = Object.create(null);
    values.forEach(function (value) {
      result[value] = true;
    });
    return Object.freeze(result);
  }

  // The SLIP-39 word list is public format metadata, not secret material. Keep
  // this guard in the shared protocol layer so a valid 20- or 33-word share
  // cannot hide inside a public BackupRecord text field in either direction.
  // It intentionally rejects a matching word sequence without attempting
  // cold-side decoding or checksum work in the warm realm.
  var SLIP39_WORD_SET = makeSet(('academic acid acne acquire acrobat activity actress adapt adequate adjust admit adorn adult advance advocate afraid again agency agree aide aircraft airline airport ajar alarm album alcohol alien alive alpha already alto aluminum always amazing ambition amount amuse analysis anatomy ancestor ancient angel angry animal answer antenna anxiety apart aquatic arcade arena argue armed artist artwork aspect auction august aunt average aviation avoid award away axis axle beam beard beaver become bedroom behavior being believe belong benefit best beyond bike biology birthday bishop black blanket blessing blimp blind blue body bolt boring born both boundary bracelet branch brave breathe briefing broken brother browser bucket budget building bulb bulge bumpy bundle burden burning busy buyer cage calcium camera campus canyon capacity capital capture carbon cards careful cargo carpet carve category cause ceiling center ceramic champion change charity check chemical chest chew chubby cinema civil class clay cleanup client climate clinic clock clogs closet clothes club cluster coal coastal coding column company corner costume counter course cover cowboy cradle craft crazy credit cricket criminal crisis critical crowd crucial crunch crush crystal cubic cultural curious curly custody cylinder daisy damage dance darkness database daughter deadline deal debris debut decent decision declare decorate decrease deliver demand density deny depart depend depict deploy describe desert desire desktop destroy detailed detect device devote diagnose dictate diet dilemma diminish dining diploma disaster discuss disease dish dismiss display distance dive divorce document domain domestic dominant dough downtown dragon dramatic dream dress drift drink drove drug dryer duckling duke duration dwarf dynamic early earth easel easy echo eclipse ecology edge editor educate either elbow elder election elegant element elephant elevator elite else email emerald emission emperor emphasis employer empty ending endless endorse enemy energy enforce engage enjoy enlarge entrance envelope envy epidemic episode equation equip eraser erode escape estate estimate evaluate evening evidence evil evoke exact example exceed exchange exclude excuse execute exercise exhaust exotic expand expect explain express extend extra eyebrow facility fact failure faint fake false family famous fancy fangs fantasy fatal fatigue favorite fawn fiber fiction filter finance findings finger firefly firm fiscal fishing fitness flame flash flavor flea flexible flip float floral fluff focus forbid force forecast forget formal fortune forward founder fraction fragment frequent freshman friar fridge friendly frost froth frozen fumes funding furl fused galaxy game garbage garden garlic gasoline gather general genius genre genuine geology gesture glad glance glasses glen glimpse goat golden graduate grant grasp gravity gray greatest grief grill grin grocery gross group grownup grumpy guard guest guilt guitar gums hairy hamster hand hanger harvest have havoc hawk hazard headset health hearing heat helpful herald herd hesitate hobo holiday holy home hormone hospital hour huge human humidity hunting husband hush husky hybrid idea identify idle image impact imply improve impulse include income increase index indicate industry infant inform inherit injury inmate insect inside install intend intimate invasion involve iris island isolate item ivory jacket jerky jewelry join judicial juice jump junction junior junk jury justice kernel keyboard kidney kind kitchen knife knit laden ladle ladybug lair lamp language large laser laundry lawsuit leader leaf learn leaves lecture legal legend legs lend length level liberty library license lift likely lilac lily lips liquid listen literary living lizard loan lobe location losing loud loyalty luck lunar lunch lungs luxury lying lyrics machine magazine maiden mailman main makeup making mama manager mandate mansion manual marathon march market marvel mason material math maximum mayor meaning medal medical member memory mental merchant merit method metric midst mild military mineral minister miracle mixed mixture mobile modern modify moisture moment morning mortgage mother mountain mouse move much mule multiple muscle museum music mustang nail national necklace negative nervous network news nuclear numb numerous nylon oasis obesity object observe obtain ocean often olympic omit oral orange orbit order ordinary organize ounce oven overall owner paces pacific package paid painting pajamas pancake pants papa paper parcel parking party patent patrol payment payroll peaceful peanut peasant pecan penalty pencil percent perfect permit petition phantom pharmacy photo phrase physics pickup picture piece pile pink pipeline pistol pitch plains plan plastic platform playoff pleasure plot plunge practice prayer preach predator pregnant premium prepare presence prevent priest primary priority prisoner privacy prize problem process profile program promise prospect provide prune public pulse pumps punish puny pupal purchase purple python quantity quarter quick quiet race racism radar railroad rainbow raisin random ranked rapids raspy reaction realize rebound rebuild recall receiver recover regret regular reject relate remember remind remove render repair repeat replace requ' + 'ire rescue research resident response result retailer retreat reunion revenue review reward rhyme rhythm rich rival river robin rocky romantic romp roster round royal ruin ruler rumor sack safari salary salon salt satisfy satoshi saver says scandal scared scatter scene scholar science scout scramble screw script scroll seafood season secret security segment senior shadow shaft shame shaped sharp shelter sheriff short should shrimp sidewalk silent silver similar simple single sister skin skunk slap slavery sled slice slim slow slush smart smear smell smirk smith smoking smug snake snapshot sniff society software soldier solution soul source space spark speak species spelling spend spew spider spill spine spirit spit spray sprinkle square squeeze stadium staff standard starting station stay steady step stick stilt story strategy strike style subject submit sugar suitable sunlight superior surface surprise survive sweater swimming swing switch symbolic sympathy syndrome system tackle tactics tadpole talent task taste taught taxi teacher teammate teaspoon temple tenant tendency tension terminal testify texture thank that theater theory therapy thorn threaten thumb thunder ticket tidy timber timely ting tofu together tolerate total toxic tracks traffic training transfer trash traveler treat trend trial tricycle trip triumph trouble true trust twice twin type typical ugly ultimate umbrella uncover undergo unfair unfold unhappy union universe unkind unknown unusual unwrap upgrade upstairs username usher usual valid valuable vampire vanish various vegan velvet venture verdict verify very veteran vexed victim video view vintage violence viral visitor visual vitamins vocal voice volume voter voting walnut warmth warn watch wavy wealthy weapon webcam welcome welfare western width wildlife window wine wireless wisdom withdraw wits wolf woman work worthy wrap wrist writing wrote year yelp yield yoga zero').split(/\s+/));

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isRecord(value) {
    return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
  }

  function containsSlip39WordSequence(value) {
    var words = value.toLowerCase().match(/[a-z]+/g);
    var lengths = [20, 33];
    if (!words || words.length < lengths[0]) {
      return false;
    }
    for (var start = 0; start < words.length; start += 1) {
      for (var lengthIndex = 0; lengthIndex < lengths.length; lengthIndex += 1) {
        var length = lengths[lengthIndex];
        if (start + length > words.length) {
          continue;
        }
        var matches = true;
        for (var wordIndex = start; wordIndex < start + length; wordIndex += 1) {
          if (!hasOwn(SLIP39_WORD_SET, words[wordIndex])) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return true;
        }
      }
    }
    return false;
  }

  function isRawSssShareToken(value) {
    var match = /^([3-9a-k])([0-9a-f]+)$/i.exec(value);
    if (!match) {
      return false;
    }
    var bits = parseInt(match[1], 36);
    var idLength = (Math.pow(2, bits) - 1).toString(16).length;
    var remainder = match[2];
    return bits >= 3 && bits <= 20
      && remainder.length >= idLength + 2
      && (remainder.length - idLength) % 2 === 0;
  }

  function containsRawSssShare(value) {
    var tokens = value.trim().split(/\s+/);
    return tokens.some(isRawSssShareToken);
  }

  function isSecretContent(value) {
    if (typeof value !== 'string') {
      return false;
    }
    var text = value.trim();
    if (containsSlip39WordSequence(text)
      || /(?:^|[^A-Za-z0-9])ms1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{45,124}(?:$|[^A-Za-z0-9])/i.test(text)
      || /(?:^|\s)shamir39(?:-p1)?(?=\s|$)/i.test(text)
      || containsRawSssShare(text)) {
      return true;
    }
    if (/\b(?:xprv|tprv|yprv|zprv|uprv|vprv|Yprv|Zprv)[1-9A-HJ-NP-Za-km-z]{20,}\b/.test(text)) {
      return true;
    }
    if (/(?:^|\s)[5KLc9][1-9A-HJ-NP-Za-km-z]{50,51}(?:$|\s)/.test(text)) {
      return true;
    }
    if (/^[0-9a-fA-F]{64}$/.test(text)) {
      return true;
    }
    var words = text.split(/\s+/);
    if ([12, 15, 18, 21, 24].includes(words.length)
      && words.every(function (word) { return /^[\p{L}\p{M}]{1,32}$/u.test(word); })) {
      return true;
    }
    return false;
  }

  function cleanText(value, maximum) {
    if (typeof value !== 'string' || value.length === 0 || value.length > maximum
      || isSecretContent(value)) {
      return null;
    }
    return value;
  }

  function cleanOptionalText(value, maximum) {
    if (value === undefined) {
      return undefined;
    }
    return cleanText(value, maximum);
  }

  function cleanNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  function cleanInteger(value, minimum, maximum) {
    return Number.isInteger(value) && value >= minimum && value <= maximum ? value : null;
  }

  function cleanBoolean(value) {
    return typeof value === 'boolean' ? value : null;
  }

  function cleanEnum(value, set, maximum) {
    var text = cleanText(value, maximum);
    return text !== null && hasOwn(set, text) ? text : null;
  }

  function cleanStringArray(value, maximumItems, maximumLength) {
    if (!Array.isArray(value) || value.length > maximumItems) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var item = cleanText(value[index], maximumLength);
      if (item === null) {
        return null;
      }
      result.push(item);
    }
    return result;
  }

  function cleanBytes(value) {
    var tag = Object.prototype.toString.call(value);
    if (tag === '[object Uint8Array]') {
      if (value.byteLength > MAX_VAULT_BYTES) {
        return null;
      }
      return new Uint8Array(value);
    }
    if (tag === '[object ArrayBuffer]') {
      if (value.byteLength > MAX_VAULT_BYTES) {
        return null;
      }
      return new Uint8Array(value.slice(0));
    }
    return null;
  }

  function cleanEmptyPayload(value) {
    return isRecord(value) ? {} : null;
  }

  function cleanStrictEmptyPayload(value) {
    return isRecord(value) && Object.keys(value).length === 0 ? {} : null;
  }

  function cleanCapabilities(value) {
    if (!isRecord(value)) {
      return null;
    }
    var result = {};
    [
      'messageChannel',
      'cryptoSubtle',
      'wasm',
      'workers',
      'opaqueOrigin',
      'cspCanary',
      'runtimeNeutering',
      'providerNeutering',
      'randomValues',
      'camera',
      'fileSystemAccess',
      'blobDownload',
      'manualExport'
    ].forEach(function (key) {
      if (typeof value[key] === 'boolean') {
        result[key] = value[key];
      }
    });
    [
      'nobleAesGcm',
      'argon2id',
      'webCryptoKat'
    ].forEach(function (key) {
      if (typeof value[key] === 'boolean') {
        result[key] = value[key];
      }
    });
    if (typeof value.kdfActive === 'string' && hasOwn(KDF_ACTIVE_SET, value.kdfActive)) {
      result.kdfActive = value.kdfActive;
    }
    return result;
  }

  function cleanUuid(value) {
    return typeof value === 'string'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ? value
      : null;
  }

  function cleanFingerprint(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}$/i.test(value) ? value : null;
  }

  function cleanXpub(value) {
    return typeof value === 'string'
      && /^(?:xpub|ypub|zpub|tpub|upub|vpub)[1-9A-HJ-NP-Za-km-z]{90,120}$/.test(value)
      ? value
      : null;
  }

  function cleanPublicAddress(value) {
    if (typeof value !== 'string' || value.length > 256 || isSecretContent(value)) {
      return null;
    }
    return /^(?:bc1|tb1|bcrt1|0x|[13mn2])[A-Za-z0-9]{20,130}$/.test(value) ? value : null;
  }

  function cleanAddressVerifyCandidate(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 256
      || isSecretContent(value) || !/^[\x09\x0a\x0d\x20-\x7e]+$/.test(value)) {
      return null;
    }
    return value;
  }

  function cleanPublicAddressArray(value) {
    if (!Array.isArray(value) || value.length > 10000) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var address = cleanPublicAddress(value[index]);
      if (address === null) {
        return null;
      }
      result.push(address);
    }
    return result;
  }

  function containsText(value, seen) {
    if (typeof value === 'string') {
      return true;
    }
    if (!value || typeof value !== 'object') {
      return false;
    }
    var visited = seen || [];
    if (visited.indexOf(value) !== -1) {
      return false;
    }
    visited.push(value);
    var keys = Object.keys(value);
    for (var index = 0; index < keys.length; index += 1) {
      if (containsText(value[keys[index]], visited)) {
        return true;
      }
    }
    return false;
  }

  var PUBLIC_FIELD_RULES = Object.freeze({
    id: 'uuid',
    fingerprint: 'fingerprint',
    xpub: 'xpub',
    address: 'address',
    addresses: 'addresses',
    amount: 'number',
    quantity: 'number',
    costBasis: 'number',
    price: 'number'
  });

  var REGISTRY_FIELD_RULES = Object.freeze({
    wallets: Object.freeze({
      id: 'uuid',
      label: 'text:256',
      seedId: 'uuid',
      fingerprint: 'fingerprint',
      type: 'text:64',
      network: 'text:64',
      scriptType: 'text:64',
      primaryPath: 'text:128',
      xpubs: 'xpubs',
      deviceIds: 'uuids',
      status: 'text:32',
      notes: 'text:10000',
      tags: 'tags',
      hidden: 'boolean'
    }),
    accounts: Object.freeze({
      id: 'uuid',
      walletId: 'uuid',
      asset: 'text:64',
      path: 'text:128',
      xpub: 'xpub',
      label: 'text:256',
      notes: 'text:10000',
      tags: 'tags',
      hidden: 'boolean'
    }),
    addresses: Object.freeze({
      id: 'uuid',
      accountId: 'uuid',
      index: 'integer',
      address: 'address',
      addressOrigin: 'address-origin',
      verificationState: 'verification-state',
      lastColdVerifiedAt: 'iso',
      verifiedAgainstXpub: 'xpub',
      label: 'text:256',
      isChange: 'boolean',
      used: 'boolean',
      balanceSnapshot: 'balanceSnapshot',
      notes: 'text:10000',
      tags: 'tags',
      hidden: 'boolean'
    }),
    devices: Object.freeze({
      id: 'uuid',
      vendor: 'text:128',
      model: 'text:128',
      serial: 'text:128',
      firmware: 'text:128',
      firmwareDate: 'iso',
      purchasedFrom: 'text:256',
      purchasedAt: 'iso',
      tamperCheckPassed: 'boolean',
      tamperCheckNotes: 'text:10000',
      pinSetAt: 'iso',
      pinChangedAt: 'iso',
      passphraseUsed: 'boolean',
      seedFingerprints: 'fingerprints',
      location: 'text:256',
      status: 'device-status',
      notes: 'text:10000',
      hidden: 'boolean'
    }),
    backups: Object.freeze({
      id: 'uuid',
      subjectId: 'uuid',
      method: 'backup-method',
      shareLabel: 'text:256',
      threshold: 'backup-threshold',
      groupConfig: 'backup-group-config',
      location: 'text:256',
      custodian: 'text:256',
      createdAt: 'iso',
      lastVerifiedAt: 'iso',
      verifyEveryDays: 'backup-verify-days',
      notes: 'text:10000',
      hidden: 'boolean'
    })
  });

  var NOTE_FIELD_RULES = Object.freeze({
    id: 'uuid',
    title: 'text:256',
    body: 'markdown:20000',
    visibility: 'public-visibility',
    linkedIds: 'uuids:64',
    tags: 'tags',
    hidden: 'boolean'
  });

  var REGISTRY_REQUIRED_FIELDS = Object.freeze({
    wallets: Object.freeze(['id']),
    accounts: Object.freeze(['id', 'walletId']),
    addresses: Object.freeze(['id', 'accountId', 'index', 'address']),
    devices: Object.freeze(['id', 'vendor', 'model', 'firmware', 'status']),
    backups: Object.freeze([
      'id', 'subjectId', 'method', 'shareLabel', 'threshold', 'createdAt', 'verifyEveryDays'
    ])
  });

  function cleanIsoTimestamp(value) {
    if (typeof value !== 'string' || value.length > 64 || isSecretContent(value)) {
      return null;
    }
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? value : null;
  }

  function cleanPublicTags(value) {
    if (!Array.isArray(value) || value.length > 32) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      if (typeof value[index] !== 'string') {
        return null;
      }
      var tag = value[index].trim().replace(/^#+/, '').toLowerCase();
      if (!tag || tag.length > 64 || isSecretContent(tag)
        || !/^[\p{L}\p{N}_:-]+$/u.test(tag)) {
        return null;
      }
      if (result.indexOf(tag) === -1) {
        result.push(tag);
      }
    }
    return result;
  }

  function cleanPublicXpubs(value) {
    if (!Array.isArray(value) || value.length > 32) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var xpub = cleanXpub(value[index]);
      if (xpub === null) {
        return null;
      }
      result.push(xpub);
    }
    return result;
  }

  function cleanPublicFingerprints(value) {
    if (!Array.isArray(value) || value.length > 32) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var fingerprint = cleanFingerprint(value[index]);
      if (fingerprint === null) {
        return null;
      }
      result.push(fingerprint);
    }
    return result;
  }

  function cleanPublicUuids(value) {
    if (!Array.isArray(value) || value.length > 32) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var uuid = cleanUuid(value[index]);
      if (uuid === null) {
        return null;
      }
      result.push(uuid);
    }
    return result;
  }

  function cleanLimitedPublicUuids(value, maximumItems) {
    if (!Array.isArray(value) || value.length > maximumItems) {
      return null;
    }
    return cleanPublicUuids(value);
  }

  function cleanBalanceSnapshot(value) {
    if (!isRecord(value)) {
      return null;
    }
    var result = {};
    var amount = cleanNumber(value.amount);
    var asOf = cleanIsoTimestamp(value.asOf);
    var source = cleanText(value.source, 64);
    if (amount === null || asOf === null || source === null) {
      return null;
    }
    var keys = Object.keys(value);
    for (var index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      if (hasOwn(SECRET_KEYS, key)) {
        return null;
      }
      if (key !== 'amount' && key !== 'asOf' && key !== 'source' && containsText(value[key])) {
        return null;
      }
    }
    result.amount = amount;
    result.asOf = asOf;
    result.source = source;
    return result;
  }

  function cleanBackupGroupConfig(value) {
    if (!isRecord(value)) {
      return null;
    }
    var result = {};
    var keys = Object.keys(value);
    var allowed = makeSet(['threshold', 'count', 'groupThreshold', 'groups']);
    if (keys.length === 0 || keys.length > 4) {
      return null;
    }
    for (var index = 0; index < keys.length; index += 1) {
      if (!hasOwn(allowed, keys[index])) {
        return null;
      }
    }
    if (value.threshold !== undefined) {
      result.threshold = cleanInteger(value.threshold, 1, 2047);
      if (result.threshold === null) {
        return null;
      }
    }
    if (value.count !== undefined) {
      result.count = cleanInteger(value.count, 1, 2047);
      if (result.count === null) {
        return null;
      }
    }
    if (value.groupThreshold !== undefined) {
      result.groupThreshold = cleanInteger(value.groupThreshold, 1, 16);
      if (result.groupThreshold === null) {
        return null;
      }
    }
    if (value.groups !== undefined) {
      if (!Array.isArray(value.groups) || value.groups.length < 1 || value.groups.length > 16) {
        return null;
      }
      result.groups = [];
      for (var groupIndex = 0; groupIndex < value.groups.length; groupIndex += 1) {
        var group = value.groups[groupIndex];
        if (!isRecord(group) || Object.keys(group).some(function (key) {
          return key !== 'threshold' && key !== 'count';
        })) {
          return null;
        }
        var groupThreshold = cleanInteger(group.threshold, 1, 16);
        var groupCount = cleanInteger(group.count, 1, 16);
        if (groupThreshold === null || groupCount === null || groupThreshold > groupCount) {
          return null;
        }
        result.groups.push({ threshold: groupThreshold, count: groupCount });
      }
    }
    if (result.groups !== undefined && result.groupThreshold !== undefined
      && result.groupThreshold > result.groups.length) {
      return null;
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  function cleanRegistryField(value, rule) {
    if (rule === 'uuid') {
      return cleanUuid(value);
    }
    if (rule === 'fingerprint') {
      return cleanFingerprint(value);
    }
    if (rule === 'xpub') {
      return cleanXpub(value);
    }
    if (rule === 'xpubs') {
      return cleanPublicXpubs(value);
    }
    if (rule === 'fingerprints') {
      return cleanPublicFingerprints(value);
    }
    if (rule === 'uuids') {
      return cleanPublicUuids(value);
    }
    if (rule === 'address') {
      return cleanPublicAddress(value);
    }
    if (rule === 'boolean') {
      return cleanBoolean(value);
    }
    if (rule === 'integer') {
      return cleanInteger(value, 0, 0x7fffffff);
    }
    if (rule === 'tags') {
      return cleanPublicTags(value);
    }
    if (rule === 'markdown:20000') {
      return cleanText(value, 20000);
    }
    if (rule === 'public-visibility') {
      return cleanEnum(value, makeSet(['public']), 16);
    }
    if (rule.indexOf('uuids:') === 0) {
      return cleanLimitedPublicUuids(value, Number(rule.slice(6)));
    }
    if (rule === 'balanceSnapshot') {
      return cleanBalanceSnapshot(value);
    }
    if (rule === 'iso') {
      return cleanIsoTimestamp(value);
    }
    if (rule === 'backup-method') {
      return cleanEnum(value, BACKUP_METHOD_SET, 32);
    }
    if (rule === 'backup-threshold') {
      return cleanInteger(value, 1, 2047);
    }
    if (rule === 'backup-verify-days') {
      return cleanInteger(value, 1, 3650);
    }
    if (rule === 'backup-group-config') {
      return cleanBackupGroupConfig(value);
    }
    if (rule === 'device-status') {
      return cleanEnum(value, DEVICE_STATUS_SET, 32);
    }
    if (rule === 'address-origin') {
      return cleanEnum(value, ADDRESS_ORIGIN_SET, 16);
    }
    if (rule === 'verification-state') {
      return cleanEnum(value, VERIFICATION_STATE_SET, 32);
    }
    if (rule.indexOf('text:') === 0) {
      return cleanText(value, Number(rule.slice(5)));
    }
    return null;
  }

  function cleanNoteRecord(value) {
    if (!isRecord(value)) {
      return null;
    }
    var required = ['id', 'title', 'body', 'visibility'];
    for (var requiredIndex = 0; requiredIndex < required.length; requiredIndex += 1) {
      if (!hasOwn(value, required[requiredIndex])) {
        return null;
      }
    }
    var result = {};
    var keys = Object.keys(value);
    for (var index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      if (hasOwn(SECRET_KEYS, key)) {
        return null;
      }
      if (!hasOwn(NOTE_FIELD_RULES, key)) {
        if (containsText(value[key])) {
          return null;
        }
        continue;
      }
      var cleaned = cleanRegistryField(value[key], NOTE_FIELD_RULES[key]);
      if (cleaned === null) {
        return null;
      }
      result[key] = cleaned;
    }
    return result;
  }

  function cleanNoteRecordArray(value) {
    if (!Array.isArray(value) || value.length > 10000) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var note = cleanNoteRecord(value[index]);
      if (note === null) {
        return null;
      }
      result.push(note);
    }
    return result;
  }

  function cleanRegistryRecord(value, collection) {
    if (!isRecord(value) || !hasOwn(REGISTRY_FIELD_RULES, collection)) {
      return null;
    }
    var rules = REGISTRY_FIELD_RULES[collection];
    var required = REGISTRY_REQUIRED_FIELDS[collection];
    var result = {};
    var inputKeys = Object.keys(value);
    for (var requiredIndex = 0; requiredIndex < required.length; requiredIndex += 1) {
      if (!hasOwn(value, required[requiredIndex])) {
        return null;
      }
    }
    for (var index = 0; index < inputKeys.length; index += 1) {
      var key = inputKeys[index];
      if (hasOwn(SECRET_KEYS, key)) {
        return null;
      }
      if (!hasOwn(rules, key)) {
        if (containsText(value[key])) {
          return null;
        }
        continue;
      }
      var cleaned = cleanRegistryField(value[key], rules[key]);
      if (cleaned === null) {
        return null;
      }
      result[key] = cleaned;
    }
    if (collection === 'addresses') {
      if (!hasOwn(result, 'addressOrigin')) {
        result.addressOrigin = 'manual';
      }
      if (!hasOwn(result, 'verificationState')) {
        result.verificationState = 'unverified';
      }
      if (result.verificationState === 'unverified' || result.verificationState === 'unverifiable') {
        delete result.lastColdVerifiedAt;
        delete result.verifiedAgainstXpub;
      } else if (!hasOwn(result, 'lastColdVerifiedAt') || !hasOwn(result, 'verifiedAgainstXpub')) {
        return null;
      }
    }
    return result;
  }

  function cleanRegistryRecordArray(value, collection) {
    if (!Array.isArray(value) || value.length > 10000) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var record = cleanRegistryRecord(value[index], collection);
      if (record === null) {
        return null;
      }
      result.push(record);
    }
    return result;
  }

  function cleanPublicRecord(value) {
    if (!isRecord(value)) {
      return null;
    }
    var result = {};
    var inputKeys = Object.keys(value);
    for (var index = 0; index < inputKeys.length; index += 1) {
      var key = inputKeys[index];
      if (hasOwn(SECRET_KEYS, key)) {
        return null;
      }
      if (!hasOwn(PUBLIC_FIELD_RULES, key)) {
        if (containsText(value[key])) {
          return null;
        }
        continue;
      }
      var rule = PUBLIC_FIELD_RULES[key];
      var cleaned;
      if (isSecretContent(value[key])) {
        return null;
      }
      if (rule === 'uuid') {
        cleaned = cleanUuid(value[key]);
      } else if (rule === 'fingerprint') {
        cleaned = cleanFingerprint(value[key]);
      } else if (rule === 'xpub') {
        cleaned = cleanXpub(value[key]);
      } else if (rule === 'address') {
        cleaned = cleanPublicAddress(value[key]);
      } else if (rule === 'addresses') {
        cleaned = cleanPublicAddressArray(value[key]);
      } else {
        cleaned = cleanNumber(value[key]);
      }
      if (cleaned === null) {
        return null;
      }
      result[key] = cleaned;
    }
    return result;
  }

  function cleanPublicRecordArray(value) {
    if (!Array.isArray(value) || value.length > 10000) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var record = cleanPublicRecord(value[index]);
      if (record === null) {
        return null;
      }
      result.push(record);
    }
    return result;
  }

  function hasPublicRecord(compartment, collection, id) {
    var records = compartment[collection];
    if (!Array.isArray(records)) {
      return false;
    }
    return records.some(function (record) { return record.id === id; });
  }

  function cleanPublicRelationships(compartment) {
    var accounts = compartment.accounts;
    if (Array.isArray(accounts) && accounts.some(function (account) {
      return !hasPublicRecord(compartment, 'wallets', account.walletId);
    })) {
      return false;
    }
    var addresses = compartment.addresses;
    if (Array.isArray(addresses) && addresses.some(function (address) {
      return !hasPublicRecord(compartment, 'accounts', address.accountId);
    })) {
      return false;
    }
    return true;
  }

  function cleanPublicCompartment(value) {
    if (!isRecord(value)) {
      return null;
    }
    if (Object.keys(value).some(function (key) { return hasOwn(SECRET_KEYS, key); })) {
      return null;
    }
    var schema = hasOwn(value, 'schema') ? cleanInteger(value.schema, 1, PUBLIC_SCHEMA_VERSION) : 1;
    if (schema === null) {
      return null;
    }
    var result = {};
    result.schema = PUBLIC_SCHEMA_VERSION;
    if (hasOwn(value, 'id')) {
      var vaultId = cleanUuid(value.id);
      if (vaultId === null) {
        return null;
      }
      result.id = vaultId;
    }
    for (var index = 0; index < COLLECTIONS.length; index += 1) {
      var collection = COLLECTIONS[index];
      if (!hasOwn(value, collection) || hasOwn(SECRET_KEYS, collection)) {
        continue;
      }
      var cleaned = hasOwn(REGISTRY_FIELD_RULES, collection)
        ? cleanRegistryRecordArray(value[collection], collection)
        : (collection === 'notes'
          ? cleanNoteRecordArray(value[collection])
          : cleanPublicRecordArray(value[collection]));
      if (cleaned === null) {
        return null;
      }
      result[collection] = cleaned;
    }
    if (!cleanPublicRelationships(result)) {
      return null;
    }
    return result;
  }

  function cleanRange(value) {
    if (!isRecord(value)) {
      return null;
    }
    var start = cleanInteger(value.start, 0, 1000000);
    var count = cleanInteger(value.count, 1, 1000);
    if (start === null || count === null) {
      return null;
    }
    return { start: start, count: count };
  }

  function cleanVaultBytes(value) {
    if (!isRecord(value)) {
      return null;
    }
    var bytes = cleanBytes(value.bytes);
    return bytes === null ? null : { bytes: bytes };
  }

  function cleanModeSet(value) {
    if (!isRecord(value)) {
      return null;
    }
    var online = cleanBoolean(value.online);
    return online === null ? null : { online: online };
  }

  function cleanDeriveRequest(value) {
    if (!isRecord(value)) {
      return null;
    }
    var accountRef = cleanText(value.accountRef, 128);
    var scriptType = cleanText(value.scriptType, 64);
    var range = cleanRange(value.range);
    if (accountRef === null || scriptType === null || range === null) {
      return null;
    }
    return { accountRef: accountRef, scriptType: scriptType, range: range };
  }

  var ADDRESS_VERIFY_OUTCOMES = Object.freeze([
    'match',
    'mismatch',
    'unrecognised-format',
    'checksum-invalid',
    'no-record',
    'different-account',
    'vault-locked'
  ]);
  var ADDRESS_VERIFY_OUTCOME_SET = makeSet(ADDRESS_VERIFY_OUTCOMES);

  function cleanAddressVerifyRequest(value) {
    if (!isRecord(value)) {
      return null;
    }
    var addressId = cleanUuid(value.addressId);
    var accountRef = cleanUuid(value.accountRef);
    var index = cleanInteger(value.index, 0, 0x7fffffff);
    var candidate = cleanAddressVerifyCandidate(value.candidate);
    if (addressId === null || accountRef === null || index === null || candidate === null) {
      return null;
    }
    return { addressId: addressId, accountRef: accountRef, index: index, candidate: candidate };
  }

  function cleanAddressVerifyResult(value) {
    if (!isRecord(value)) {
      return null;
    }
    var addressId = cleanUuid(value.addressId);
    var outcome = cleanEnum(value.outcome, ADDRESS_VERIFY_OUTCOME_SET, 32);
    var verificationState = cleanEnum(value.verificationState, VERIFICATION_STATE_SET, 32);
    if (addressId === null || outcome === null || verificationState === null) {
      return null;
    }
    var result = {
      addressId: addressId,
      outcome: outcome,
      verificationState: verificationState
    };
    if (value.divergenceIndex !== undefined) {
      var divergenceIndex = cleanInteger(value.divergenceIndex, -1, 256);
      if (divergenceIndex === null) {
        return null;
      }
      result.divergenceIndex = divergenceIndex;
    }
    if (value.verifiedAt !== undefined) {
      var verifiedAt = cleanIsoTimestamp(value.verifiedAt);
      if (verifiedAt === null) {
        return null;
      }
      result.verifiedAt = verifiedAt;
    }
    if (value.xpubFingerprint !== undefined) {
      var xpubFingerprint = cleanFingerprint(value.xpubFingerprint);
      if (xpubFingerprint === null) {
        return null;
      }
      result.xpubFingerprint = xpubFingerprint;
    }
    return result;
  }

  function cleanBackupVerifyRequest(value) {
    if (!isRecord(value)) {
      return null;
    }
    var backupId = cleanUuid(value.backupId);
    return backupId === null ? null : { backupId: backupId };
  }

  function cleanBackupVerifyResult(value) {
    if (!isRecord(value)) {
      return null;
    }
    var backupId = cleanUuid(value.backupId);
    var outcome = cleanEnum(value.outcome, BACKUP_VERIFY_OUTCOME_SET, 32);
    if (backupId === null || outcome === null) {
      return null;
    }
    var result = { backupId: backupId, outcome: outcome };
    if (value.verifiedAt !== undefined) {
      var verifiedAt = cleanIsoTimestamp(value.verifiedAt);
      if (verifiedAt === null || outcome !== 'verified') {
        return null;
      }
      result.verifiedAt = verifiedAt;
    } else if (outcome === 'verified') {
      return null;
    }
    return result;
  }

  function cleanPublicDataRequest(value) {
    if (!isRecord(value)) {
      return null;
    }
    var collections = cleanStringArray(value.collections, COLLECTIONS.length, 64);
    if (collections === null) {
      return null;
    }
    for (var index = 0; index < collections.length; index += 1) {
      if (!hasOwn(COLLECTION_SET, collections[index])) {
        return null;
      }
    }
    return { collections: collections };
  }

  function cleanPublicDataReplace(value) {
    if (!isRecord(value) || !hasOwn(value, 'publicCompartment')) {
      return null;
    }
    var publicCompartment = cleanPublicCompartment(value.publicCompartment);
    return publicCompartment === null ? null : { publicCompartment: publicCompartment };
  }

  function cleanConcealmentRevealed(value) {
    if (!isRecord(value) || typeof value.revealed !== 'boolean') {
      return null;
    }
    return { revealed: value.revealed };
  }

  function cleanSecretDataUpdated(value) {
    if (!isRecord(value) || value.dirty !== true) {
      return null;
    }
    return { dirty: true };
  }

  function utf8Length(value) {
    var length = 0;
    for (var index = 0; index < value.length; index += 1) {
      var code = value.charCodeAt(index);
      if (code < 0x80) {
        length += 1;
      } else if (code < 0x800) {
        length += 2;
      } else if (code >= 0xd800 && code <= 0xdbff
        && index + 1 < value.length
        && value.charCodeAt(index + 1) >= 0xdc00
        && value.charCodeAt(index + 1) <= 0xdfff) {
        length += 4;
        index += 1;
      } else {
        length += 3;
      }
    }
    return length;
  }

  function payloadWithinLimit(payload, maximum) {
    var serialized;
    try {
      serialized = JSON.stringify(payload);
    } catch (error) {
      return false;
    }
    return typeof serialized === 'string' && utf8Length(serialized) <= maximum;
  }

  function cleanUiNavigate(value) {
    if (!isRecord(value)) {
      return null;
    }
    var section = cleanEnum(value.section, SECTION_SET, 64);
    return section === null ? null : { section: section };
  }

  function cleanReady(value) {
    if (!isRecord(value) || !hasOwn(value, 'capabilities')) {
      return null;
    }
    var capabilities = cleanCapabilities(value.capabilities);
    return capabilities === null ? null : { capabilities: capabilities };
  }

  function cleanVaultOpened(value) {
    if (!isRecord(value) || !hasOwn(value, 'publicCompartment')) {
      return null;
    }
    var publicCompartment = cleanPublicCompartment(value.publicCompartment);
    return publicCompartment === null ? null : { publicCompartment: publicCompartment };
  }

  function cleanDeriveResult(value) {
    if (!isRecord(value)) {
      return null;
    }
    var addresses = cleanPublicAddressArray(value.addresses);
    var xpub = cleanXpub(value.xpub);
    var fingerprint = cleanFingerprint(value.fingerprint);
    if (addresses === null || xpub === null || fingerprint === null) {
      return null;
    }
    return { addresses: addresses, xpub: xpub, fingerprint: fingerprint };
  }

  function cleanStatus(value) {
    if (!isRecord(value)) {
      return null;
    }
    var locked = cleanBoolean(value.locked);
    var mode = cleanEnum(value.mode, makeSet(['cold', 'warm']), 16);
    var warnings = cleanStringArray(value.warnings, WARNING_CODES.length, 64);
    if (locked === null || mode === null || warnings === null) {
      return null;
    }
    for (var index = 0; index < warnings.length; index += 1) {
      if (!hasOwn(WARNING_SET, warnings[index])) {
        return null;
      }
    }
    return { locked: locked, mode: mode, warnings: warnings };
  }

  function cleanError(value) {
    if (!isRecord(value)) {
      return null;
    }
    var code = cleanEnum(value.code, ERROR_MESSAGES, 64);
    if (code === null) {
      return null;
    }
    return { code: code, message: ERROR_MESSAGES[code] };
  }

  var WARM_TO_COLD = Object.freeze({
    'vault.open': cleanVaultBytes,
    'vault.create.prepare': cleanStrictEmptyPayload,
    'vault.saveRequest': cleanEmptyPayload,
    'vault.lock': cleanEmptyPayload,
    'panic.hide': cleanEmptyPayload,
    'mode.set': cleanModeSet,
    'derive.request': cleanDeriveRequest,
    'address.verifyRequest': cleanAddressVerifyRequest,
    'backup.verifyRequest': cleanBackupVerifyRequest,
    'publicData.request': cleanPublicDataRequest,
    'publicData.replace': cleanPublicDataReplace,
    'concealment.reveal': cleanStrictEmptyPayload,
    'ui.navigate': cleanUiNavigate
  });
  var COLD_TO_WARM = Object.freeze({
    ready: cleanReady,
    'vault.opened': cleanVaultOpened,
    'vault.bytes': cleanVaultBytes,
    'vault.lockRequest': cleanStrictEmptyPayload,
    'derive.result': cleanDeriveResult,
    'address.verifyResult': cleanAddressVerifyResult,
    'backup.verifyResult': cleanBackupVerifyResult,
    'publicData.updated': cleanVaultOpened,
    'concealment.revealed': cleanConcealmentRevealed,
    'secretData.updated': cleanSecretDataUpdated,
    'vault.dirty': cleanSecretDataUpdated,
    status: cleanStatus,
    error: cleanError,
    'panic.hide': cleanEmptyPayload
  });
  var DIRECTIONS = Object.freeze({
    'warm-to-cold': WARM_TO_COLD,
    'cold-to-warm': COLD_TO_WARM
  });

  function cleanMessageId(value) {
    var id = cleanText(value, 96);
    return id !== null && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id) ? id : null;
  }

  function validateMessage(direction, raw) {
    var definitions = DIRECTIONS[direction];
    if (!definitions || !isRecord(raw)) {
      return null;
    }
    var id = cleanMessageId(raw.id);
    var type = cleanText(raw.type, 64);
    if (id === null || type === null || !hasOwn(definitions, type)) {
      return null;
    }
    var payload = definitions[type](raw.payload);
    if (payload === null) {
      return null;
    }
    if (type === 'vault.open' || type === 'vault.bytes') {
      return { id: id, type: type, payload: payload };
    }
    return payloadWithinLimit(payload, MAX_PUBLIC_PAYLOAD_BYTES)
      ? { id: id, type: type, payload: payload }
      : null;
  }

  function createMessage(direction, id, type, payload) {
    return validateMessage(direction, { id: id, type: type, payload: payload });
  }

  function isReadySignal(value) {
    return isRecord(value)
      && value.type === 'cold.ready'
      && Object.keys(value).length === 1;
  }

  function handshakeMessage() {
    return { type: 'cold.handshake', payload: { version: PROTOCOL_VERSION } };
  }

  function isHandshakeMessage(value) {
    return isRecord(value)
      && value.type === 'cold.handshake'
      && isRecord(value.payload)
      && value.payload.version === PROTOCOL_VERSION
      && Object.keys(value).length === 2
      && Object.keys(value.payload).length === 1;
  }

  function messageTypes(direction) {
    var definitions = DIRECTIONS[direction];
    return definitions ? Object.keys(definitions) : [];
  }

  var api = Object.freeze({
    version: PROTOCOL_VERSION,
    limits: Object.freeze({
      maxVaultBytes: MAX_VAULT_BYTES,
      maxPublicPayloadBytes: MAX_PUBLIC_PAYLOAD_BYTES
    }),
    validateMessage: validateMessage,
    createMessage: createMessage,
    isReadySignal: isReadySignal,
    handshakeMessage: handshakeMessage,
    isHandshakeMessage: isHandshakeMessage,
    isSecretContent: isSecretContent,
    messageTypes: messageTypes
  });

  Object.defineProperty(global, '__coldboxProtocol', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
