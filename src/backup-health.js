(function (global) {
  'use strict';

  var DAY_MS = 86400000;
  var SUPPORTED_METHODS = Object.freeze(['slip39', 'codex32', 'seedxor', 'shamir39', 'sss']);

  function text(value) {
    return typeof value === 'string' ? value : '';
  }

  function normalized(value) {
    return text(value).trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function dateTime(value) {
    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function nowTime(value) {
    if (value instanceof Date) {
      return Number.isFinite(value.getTime()) ? value.getTime() : Date.now();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      var parsed = dateTime(value);
      return parsed === null ? Date.now() : parsed;
    }
    return Date.now();
  }

  function dateRepresentable(value) {
    if (!Number.isFinite(value)) {
      return false;
    }
    return Number.isFinite(new Date(value).getTime());
  }

  function isoDate(value) {
    return dateRepresentable(value) ? new Date(value).toISOString().split('T')[0] : '';
  }

  function hasMethod(method) {
    return SUPPORTED_METHODS.indexOf(method) !== -1;
  }

  function evaluate(record, now) {
    var value = record && typeof record === 'object' ? record : {};
    var method = text(value.method);
    var threshold = value.threshold;
    var interval = value.verifyEveryDays;
    var verifiedAt = dateTime(value.lastVerifiedAt);
    var createdAt = dateTime(value.createdAt);
    var dueAt = null;
    var issues = [];
    var state = 'unverified';

    if (!text(value.id)) {
      issues.push('missing-id');
    }
    if (!text(value.subjectId)) {
      issues.push('missing-subject');
    }
    if (!method) {
      issues.push('missing-method');
    } else if (!hasMethod(method)) {
      issues.push('unsupported-method');
    }
    if (!text(value.shareLabel)) {
      issues.push('missing-share-label');
    }
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 2047) {
      issues.push('invalid-threshold');
    }
    if (createdAt === null) {
      issues.push('invalid-created-at');
    }
    if (!Number.isInteger(interval) || interval < 1 || interval > 3650) {
      issues.push('invalid-verify-interval');
    }
    if (text(value.lastVerifiedAt) && verifiedAt === null) {
      issues.push('invalid-last-verified-at');
    }

    var evaluationTime = nowTime(now);
    if (verifiedAt !== null && Number.isInteger(interval) && interval >= 1 && interval <= 3650) {
      var candidateDueAt = verifiedAt + interval * DAY_MS;
      if (!dateRepresentable(candidateDueAt)) {
        issues.push('invalid-due-at');
      } else {
        dueAt = candidateDueAt;
        if (verifiedAt > evaluationTime) {
          issues.push('future-last-verified-at');
        } else {
          state = evaluationTime >= dueAt ? 'overdue' : 'current';
        }
      }
    }

    if (!hasMethod(method)) {
      state = 'unverified';
    }

    if (issues.indexOf('invalid-created-at') !== -1
      || issues.indexOf('invalid-verify-interval') !== -1
      || issues.indexOf('invalid-last-verified-at') !== -1
      || issues.indexOf('invalid-due-at') !== -1
      || issues.indexOf('future-last-verified-at') !== -1
      || issues.indexOf('invalid-threshold') !== -1
      || issues.indexOf('missing-id') !== -1
      || issues.indexOf('missing-subject') !== -1
      || issues.indexOf('missing-method') !== -1
      || issues.indexOf('missing-share-label') !== -1) {
      state = 'invalid';
    }

    return {
      recordId: text(value.id),
      subjectId: text(value.subjectId),
      method: method,
      shareLabel: text(value.shareLabel),
      threshold: Number.isInteger(threshold) ? threshold : null,
      location: text(value.location),
      custodian: text(value.custodian),
      state: state,
      issues: issues,
      verificationSupported: hasMethod(method),
      lastVerifiedAt: verifiedAt,
      lastVerifiedDate: isoDate(verifiedAt),
      dueAt: dueAt,
      dueDate: isoDate(dueAt),
      hasLocation: normalized(value.location).length > 0,
      hasCustodian: normalized(value.custodian).length > 0
    };
  }

  function addUnique(values, value) {
    if (value && values.indexOf(value) === -1) {
      values.push(value);
    }
  }

  function findSubject(subjects, subjectId) {
    for (var index = 0; index < subjects.length; index += 1) {
      if (subjects[index].subjectId === subjectId) {
        return subjects[index];
      }
    }
    var subject = {
      subjectId: subjectId,
      recordIds: [],
      locations: [],
      custodians: [],
      locationRecordIds: {},
      custodianRecordIds: {},
      missingPlacementRecordIds: [],
      coLocatedLocationRecordIds: [],
      coLocatedCustodianRecordIds: []
    };
    subjects.push(subject);
    return subject;
  }

  function addPlacement(subject, evaluation) {
    var recordId = evaluation.recordId;
    var location = normalized(evaluation.location);
    var custodian = normalized(evaluation.custodian);
    addUnique(subject.recordIds, recordId);
    if (location) {
      if (!subject.locationRecordIds[location]) {
        subject.locationRecordIds[location] = [];
      }
      subject.locationRecordIds[location].push(recordId);
      if (subject.locationRecordIds[location].length > 1) {
        addUnique(subject.coLocatedLocationRecordIds, recordId);
        addUnique(
          subject.coLocatedLocationRecordIds,
          subject.locationRecordIds[location][subject.locationRecordIds[location].length - 2]
        );
      }
      addUnique(subject.locations, location);
    }
    if (custodian) {
      if (!subject.custodianRecordIds[custodian]) {
        subject.custodianRecordIds[custodian] = [];
      }
      subject.custodianRecordIds[custodian].push(recordId);
      if (subject.custodianRecordIds[custodian].length > 1) {
        addUnique(subject.coLocatedCustodianRecordIds, recordId);
        addUnique(
          subject.coLocatedCustodianRecordIds,
          subject.custodianRecordIds[custodian][subject.custodianRecordIds[custodian].length - 2]
        );
      }
      addUnique(subject.custodians, custodian);
    }
    if (!location && !custodian) {
      subject.missingPlacementRecordIds.push(recordId);
    }
  }

  function finalizeSubject(subject) {
    var coLocated = subject.coLocatedLocationRecordIds.length > 0
      || subject.coLocatedCustodianRecordIds.length > 0;
    var placementStatus = 'unknown';
    if (subject.missingPlacementRecordIds.length > 0) {
      placementStatus = 'unknown';
    } else if (subject.locations.length > 1) {
      placementStatus = 'distributed-unproven';
    } else if (subject.locations.length === 1 || subject.custodians.length > 0) {
      placementStatus = 'single-location';
    }
    return {
      subjectId: subject.subjectId,
      recordIds: subject.recordIds.slice(),
      locationCount: subject.locations.length,
      custodianCount: subject.custodians.length,
      placementStatus: placementStatus,
      coLocated: coLocated,
      coLocatedLocationRecordIds: subject.coLocatedLocationRecordIds.slice(),
      coLocatedCustodianRecordIds: subject.coLocatedCustodianRecordIds.slice(),
      missingPlacementRecordIds: subject.missingPlacementRecordIds.slice()
    };
  }

  function alert(code, severity, recordIds, subjectIds) {
    return {
      code: code,
      severity: severity,
      recordIds: (recordIds || []).slice(),
      subjectIds: (subjectIds || []).slice()
    };
  }

  function summarize(records, now) {
    var input = Array.isArray(records) ? records : [];
    var evaluations = input.map(function (record) { return evaluate(record, now); });
    var subjects = [];
    var currentCount = evaluations.filter(function (item) { return item.state === 'current'; }).length;
    var overdueCount = evaluations.filter(function (item) { return item.state === 'overdue'; }).length;
    var unverifiedCount = evaluations.filter(function (item) { return item.state === 'unverified'; }).length;
    var invalidCount = evaluations.filter(function (item) { return item.state === 'invalid'; }).length;
    var unsupportedCount = evaluations.filter(function (item) { return !item.verificationSupported; }).length;
    var missingPlacement = evaluations.filter(function (item) {
      return !item.hasLocation && !item.hasCustodian;
    });
    var alerts = [];

    evaluations.forEach(function (evaluation) {
      if (!evaluation.subjectId) {
        return;
      }
      addPlacement(findSubject(subjects, evaluation.subjectId), evaluation);
    });

    var finalizedSubjects = subjects.map(finalizeSubject);
    var coLocatedSubjects = finalizedSubjects.filter(function (subject) { return subject.coLocated; });
    var subjectsWithUnknownPlacement = finalizedSubjects.filter(function (subject) {
      return subject.placementStatus === 'unknown';
    });
    var subjectsWithSingleLocation = finalizedSubjects.filter(function (subject) {
      return subject.placementStatus === 'single-location';
    });
    var placementStatus = finalizedSubjects.length === 0
      ? 'unknown'
      : subjectsWithUnknownPlacement.length > 0
        ? 'unknown'
        : subjectsWithSingleLocation.length > 0
          ? 'single-location'
          : 'distributed-unproven';

    if (input.length === 0) {
      alerts.push(alert('no-records', 'info'));
    }
    if (invalidCount > 0) {
      alerts.push(alert(
        'invalid-records',
        'critical',
        evaluations.filter(function (item) { return item.state === 'invalid'; }).map(function (item) { return item.recordId; })
      ));
    }
    if (overdueCount > 0) {
      alerts.push(alert(
        'overdue-verification',
        'warning',
        evaluations.filter(function (item) { return item.state === 'overdue'; }).map(function (item) { return item.recordId; })
      ));
    }
    if (unverifiedCount > 0) {
      alerts.push(alert(
        'unverified-records',
        'warning',
        evaluations.filter(function (item) { return item.state === 'unverified'; }).map(function (item) { return item.recordId; })
      ));
    }
    if (unsupportedCount > 0) {
      alerts.push(alert(
        'unsupported-methods',
        'warning',
        evaluations.filter(function (item) { return !item.verificationSupported; }).map(function (item) { return item.recordId; })
      ));
    }
    if (missingPlacement.length > 0) {
      alerts.push(alert(
        'missing-placement',
        'warning',
        missingPlacement.map(function (item) { return item.recordId; }),
        missingPlacement.map(function (item) { return item.subjectId; }).filter(Boolean)
      ));
    }
    if (coLocatedSubjects.length > 0) {
      alerts.push(alert(
        'co-located-placement',
        'warning',
        coLocatedSubjects.reduce(function (all, subject) {
          return all.concat(subject.coLocatedLocationRecordIds, subject.coLocatedCustodianRecordIds);
        }, []),
        coLocatedSubjects.map(function (subject) { return subject.subjectId; })
      ));
    }
    if (input.length > 0) {
      alerts.push(alert(
        'placement-unproven',
        'warning',
        evaluations.map(function (item) { return item.recordId; }),
        finalizedSubjects.map(function (subject) { return subject.subjectId; })
      ));
    }

    var actionCount = unverifiedCount + overdueCount + invalidCount;
    var state = input.length === 0
      ? 'empty'
      : actionCount > 0 || placementStatus !== 'distributed-unproven'
        ? 'attention'
        : 'current-unproven';
    return {
      state: state,
      placementStatus: placementStatus,
      totalCount: evaluations.length,
      currentCount: currentCount,
      overdueCount: overdueCount,
      unverifiedCount: unverifiedCount,
      invalidCount: invalidCount,
      unsupportedCount: unsupportedCount,
      actionCount: actionCount,
      evaluations: evaluations,
      subjects: finalizedSubjects,
      alerts: alerts
    };
  }

  function verificationLabel(evaluation) {
    if (!evaluation || evaluation.state === 'unverified' || !evaluation.verificationSupported) {
      if (evaluation && !evaluation.verificationSupported) {
        return 'Not verified — this method has no in-app reconstruction workflow';
      }
      return 'Not verified — this backup is incomplete';
    }
    if (evaluation.state === 'overdue') {
      return 'Cold verified ' + evaluation.lastVerifiedDate + ' — overdue since ' + evaluation.dueDate;
    }
    if (evaluation.state === 'current') {
      return 'Cold verified ' + evaluation.lastVerifiedDate + ' — due ' + evaluation.dueDate;
    }
    return 'Needs review — backup metadata is not valid';
  }

  global.__coldboxBackupHealth = Object.freeze({
    dayMs: DAY_MS,
    supportedMethods: SUPPORTED_METHODS,
    evaluate: evaluate,
    summarize: summarize,
    verificationLabel: verificationLabel
  });
}(window));
