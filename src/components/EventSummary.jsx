import './EventFilter.jsx';

export default function EventSummary({ event }) {
    const totalEvents = event.length;
    const totalCapacity = getEventCapacity({ event });
    const totalRegistered = getEventRegistered({ event });
    const totalAvailableSpots = getEventAvailableSpots({ event });
    const totalFullEvents = getEventFull({ event });

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

function getEventCapacity({ event }) {
    var totalCapacity = 0;
    for (var i = 0; i < event.length; i++) {
        totalCapacity += event[i].capacity;
    }
    return totalCapacity;
}

function getEventRegistered({ event }) {
    var totalTrainersRegistered = 0;
    for (var i = 0; i < event.length; i++) {
        totalTrainersRegistered += event[i].registered;
    }
    return totalTrainersRegistered;
}

function getEventAvailableSpots({ event }) {
    var totalAvailableSpots = 0;
    for (var i = 0; i < event.length; i++) {
        totalAvailableSpots += event[i].capacity - event[i].registered;
    }
    return totalAvailableSpots;
}

function getEventFull({ event }) {
    var totalFullEvents = 0;
    for (var i = 0; i < event.length; i++) {
        if (event[i].registered >= event[i].capacity) {
            totalFullEvents++;
        }
    }
    return totalFullEvents;
}