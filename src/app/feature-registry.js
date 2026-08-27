import { todayFeature } from '../features/today/index.js';
import { workoutFeature } from '../features/workout/index.js';
import { recordsFeature } from '../features/records/index.js';
import { coachFeature } from '../features/coach/index.js';
import { profileFeature } from '../features/profile/index.js';

const features = [todayFeature, workoutFeature, recordsFeature, coachFeature, profileFeature];

export const featureRegistry = new Map(features.map((feature) => [feature.id, feature]));

export function getFeature(id) {
    return featureRegistry.get(id) || featureRegistry.get('today');
}

