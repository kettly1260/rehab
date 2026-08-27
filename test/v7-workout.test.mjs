// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveWorkoutViewState } from '../src/features/workout/index.js';

const css = await readFile(new URL('../css-src/65-v7-workout.css', import.meta.url), 'utf8');
const feature = await readFile(new URL('../src/features/workout/index.js', import.meta.url), 'utf8');
const system = await readFile(new URL('../workout-system.js', import.meta.url), 'utf8');
const readiness = await readFile(new URL('../workout-readiness.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('V7 Workout resolves idle, starting, running, resting, paused, finished, error and resume states', () => {
    assert.equal(resolveWorkoutViewState().status, 'idle');
    assert.equal(resolveWorkoutViewState({ detail: { status: 'starting' } }).status, 'starting');
    assert.equal(resolveWorkoutViewState({ workout: { isPlaying: true } }).status, 'running');
    assert.equal(resolveWorkoutViewState({ workout: { isPlaying: true }, detail: { phase: 'actionRest' } }).status, 'resting');
    assert.equal(resolveWorkoutViewState({ workout: { isPlaying: true, isPaused: true } }).status, 'paused');
    assert.equal(resolveWorkoutViewState({ detail: { status: 'completed' } }).status, 'finished');
    assert.equal(resolveWorkoutViewState({ detail: { status: 'error' } }).status, 'error');
    assert.equal(resolveWorkoutViewState({ journal: { isPlaying: true } }).status, 'resume');
});

test('V7 Workout exposes cardio, strength logging, recovery and stretch ownership without changing engine modes', () => {
    assert.equal(resolveWorkoutViewState({ workout: { mode: 'cardio' } }).mode, 'cardio');
    assert.equal(resolveWorkoutViewState({ workout: { mode: 'strengthLog' } }).status, 'strength-logging');
    assert.equal(resolveWorkoutViewState({ detail: { action: { nature: 'recovery' } } }).focus, 'recovery');
    assert.equal(resolveWorkoutViewState({ detail: { action: { nature: 'stretch' } } }).focus, 'stretch');
});

test('V7 Workout keeps timer, lists, fields and secondary controls on stable surfaces', () => {
    assert.match(css, /#workout \.timer-panel,[\s\S]*backdrop-filter:\s*none/i);
    assert.match(css, /#workout \.list-item,[\s\S]*backdrop-filter:\s*none/i);
    assert.match(css, /#workout \.timer-stats[\s\S]*backdrop-filter:\s*none/i);
    assert.doesNotMatch(css, /transition\s*:\s*all\b/i);
    assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
    assert.doesNotMatch(css, /will-change\s*:/i);
});

test('V7 Workout reserves Liquid interaction for the Play/Pause control', () => {
    assert.match(feature, /querySelector\('#playBtn'\)/);
    assert.match(feature, /data-v7-liquid/);
    assert.doesNotMatch(css, /backdrop-filter:\s*blur/i);
});

test('Workout route cleanup releases UI listeners without stopping the session owner', () => {
    assert.match(feature, /scope\.listen\(host, 'workout:state'/);
    assert.match(feature, /scope\.observe\(observer, root/);
    assert.match(feature, /workoutReadiness\?\.unmount/);
    assert.match(feature, /workout\?\.unbindHotkeys/);
    assert.doesNotMatch(feature, /\.stop\?\.|\.finish\?\.|workoutState\?\.clear/);
    assert.match(system, /removeEventListener\('keydown', this\._hotkeyHandler\)/);
    assert.match(readiness, /removeEventListener\('visibilitychange', render\)/);
    assert.doesNotMatch(index, /_workoutHotkeys/);
});
