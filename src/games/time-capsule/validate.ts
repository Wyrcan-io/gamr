import type { Condition, Effect, EpisodeDefinition } from './types';

function duplicateIds(ids: string[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`Duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

function conditionRefs(condition: Condition, episode: EpisodeDefinition, errors: string[]): void {
  switch (condition.op) {
    case 'all':
    case 'any': condition.conditions.forEach(value => conditionRefs(value, episode, errors)); break;
    case 'not': conditionRefs(condition.condition, episode, errors); break;
    case 'room': if (!episode.rooms.some(room => room.id === condition.roomId)) errors.push(`Condition references unknown room: ${condition.roomId}`); break;
    case 'actorAt':
      if (!episode.actors.some(actor => actor.id === condition.actorId)) errors.push(`Condition references unknown actor: ${condition.actorId}`);
      if (!episode.rooms.some(room => room.id === condition.roomId)) errors.push(`Condition references unknown room: ${condition.roomId}`);
      break;
    case 'hasAnchor':
    case 'discoveredThisLoop': if (!episode.anchors.some(anchor => anchor.id === condition.anchorId)) errors.push(`Condition references unknown anchor: ${condition.anchorId}`); break;
    case 'hasItem': if (!episode.items.some(item => item.id === condition.itemId)) errors.push(`Condition references unknown item: ${condition.itemId}`); break;
    case 'flag':
    case 'tick': break;
  }
}

function effectRefs(effect: Effect, episode: EpisodeDefinition, errors: string[]): void {
  if (effect.op === 'moveActor' && !episode.actors.some(actor => actor.id === effect.actorId)) errors.push(`Effect references unknown actor: ${effect.actorId}`);
  if (effect.op === 'moveActor' && !episode.rooms.some(room => room.id === effect.roomId)) errors.push(`Effect references unknown room: ${effect.roomId}`);
  if ((effect.op === 'discover' || effect.op === 'masterScene') && effect.op === 'discover' && !episode.anchors.some(anchor => anchor.id === effect.anchorId)) errors.push(`Effect references unknown anchor: ${effect.anchorId}`);
  if ((effect.op === 'addItem' || effect.op === 'removeItem' || effect.op === 'placeItem') && !episode.items.some(item => item.id === effect.itemId)) errors.push(`Effect references unknown item: ${effect.itemId}`);
  if (effect.op === 'placeItem' && effect.roomId && !episode.rooms.some(room => room.id === effect.roomId)) errors.push(`Effect references unknown room: ${effect.roomId}`);
  if (effect.op === 'finishEpisode' && !episode.endings.some(ending => ending.id === effect.endingId)) errors.push(`Effect references unknown ending: ${effect.endingId}`);
}

export function validateEpisode(episode: EpisodeDefinition): string[] {
  const errors: string[] = [];
  const roomIds = episode.rooms.map(room => room.id);
  const actorIds = episode.actors.map(actor => actor.id);
  const itemIds = episode.items.map(item => item.id);
  const actionIds = episode.actions.map(action => action.id);
  const eventIds = episode.scheduledEvents.map(event => event.id);
  const endingIds = episode.endings.map(ending => ending.id);
  duplicateIds(roomIds, 'room', errors);
  duplicateIds(actorIds, 'actor', errors);
  duplicateIds(itemIds, 'item', errors);
  duplicateIds(episode.anchors.map(anchor => anchor.id), 'anchor', errors);
  duplicateIds(actionIds, 'action', errors);
  duplicateIds(eventIds, 'event', errors);
  duplicateIds(endingIds, 'ending', errors);
  if (!roomIds.includes(episode.startRoom)) errors.push(`Start room does not exist: ${episode.startRoom}`);
  for (const room of episode.rooms) for (const neighbour of room.neighbours) if (!roomIds.includes(neighbour)) errors.push(`Room ${room.id} references unknown neighbour: ${neighbour}`);
  for (const actor of episode.actors) {
    if (!roomIds.includes(actor.home)) errors.push(`Actor ${actor.id} has unknown home: ${actor.home}`);
    for (const room of Object.values(actor.schedule)) if (!roomIds.includes(room)) errors.push(`Actor ${actor.id} has unknown schedule room: ${room}`);
  }
  for (const item of episode.items) if (item.spawnRoom && !roomIds.includes(item.spawnRoom)) errors.push(`Item ${item.id} has unknown spawn room: ${item.spawnRoom}`);
  for (const action of episode.actions) {
    if (!roomIds.includes(action.roomId)) errors.push(`Action ${action.id} has unknown room: ${action.roomId}`);
    if (action.visibleWhen) conditionRefs(action.visibleWhen, episode, errors);
    if (action.availableWhen) conditionRefs(action.availableWhen, episode, errors);
    action.effects.forEach(effect => effectRefs(effect, episode, errors));
  }
  for (const event of episode.scheduledEvents) {
    if (event.tick < 0 || event.tick >= episode.loopTicks) errors.push(`Event ${event.id} is outside the loop: ${event.tick}`);
    event.effects?.forEach(effect => effectRefs(effect, episode, errors));
  }
  for (const ending of episode.endings) {
    if (ending.requiredAnchors.length !== 3) errors.push(`Ending ${ending.id} must require three anchors.`);
    const categoryCounts = { memory: 0, object: 0, clue: 0 };
    for (const anchorId of ending.requiredAnchors) {
      const definition = episode.anchors.find(anchor => anchor.id === anchorId);
      if (!definition) errors.push(`Ending ${ending.id} references unknown anchor: ${anchorId}`);
      else categoryCounts[definition.kind] += 1;
    }
    if (categoryCounts.memory !== 1 || categoryCounts.object !== 1 || categoryCounts.clue !== 1) errors.push(`Ending ${ending.id} must require one memory, one object, and one clue.`);
  }
  for (const lead of episode.leads) if (lead.levels.length !== 3) errors.push(`Lead ${lead.id} must have three hint levels.`);
  return errors;
}
