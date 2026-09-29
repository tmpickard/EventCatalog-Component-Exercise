import type { Event } from '../types/event';

interface EventSummaryProps {
    events: Event[];
}

export default function EventSummary({ events }: EventSummaryProps) {
    const totalEvents = events.length;
    const totalCapacity = getEventCapacity(events);
    const totalRegistered = getEventRegistered(events);
    const totalAvailableSpots = getEventAvailableSpots(events);
    const totalFullEvents = getEventFull(events);

    return (
        <section>
            <h3>Total Events:  {totalEvents}</h3>
            <h3>Total Capacity:  {totalCapacity}</h3>
            <h3>Total Registered Trainers: {totalRegistered}</h3>
            <h3>Available Spots: {totalAvailableSpots}</h3>
            <h3>Full Events: {totalFullEvents}</h3>
        </section>
    );
}

function getEventCapacity(events: Event[]) {
    var totalCapacity = 0;
    for (var i = 0; i < events.length; i++) {
        totalCapacity += events[i].capacity;
    }
    return totalCapacity;
}

function getEventRegistered(events: Event[]) {
    var totalTrainersRegistered = 0;
    for (var i = 0; i < events.length; i++) {
        totalTrainersRegistered += events[i].registered;
    }
    return totalTrainersRegistered;
}

function getEventAvailableSpots(events: Event[]) {
    var totalAvailableSpots = 0;
    for (var i = 0; i < events.length; i++) {
        totalAvailableSpots += events[i].capacity - events[i].registered;
    }
    return totalAvailableSpots;
}

function getEventFull(events: Event[]) {
    var totalFullEvents = 0;
    for (var i = 0; i < events.length; i++) {
        if (events[i].registered >= events[i].capacity) {
            totalFullEvents++;
        }
    }
    return totalFullEvents;
}