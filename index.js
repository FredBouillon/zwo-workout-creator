const target = chart.series[0].yData;
const time = chart.series[0].xData;
let result = [];
let intervalInitialValue = 0;

function getTotalWorkoutTime() {
	let totalWorkoutTime = 0;
  result.forEach(interval => {totalWorkoutTime += interval.time});
  return totalWorkoutTime;
}

function getWorkoutName() {
	const original = addthis_share.title;
  return original.substr(0, original.indexOf('by ')).trim();
}

function getResultIntervals() {
	let intervals = ``;
  result.forEach(interval => {
  	if (interval.state === 'steady') {
  		intervals += `<SteadyState Duration="${interval.time}" Power="${interval.value}"/>`;
    } else if (interval.state === 'ramp') {
    	if (interval.minValue > interval.maxValue) {
        intervals += `<Cooldown Duration="${interval.time}" PowerLow="${interval.minValue}" PowerHigh="${interval.maxValue}"/>`;
      } else {
        intervals += `<Warmup Duration="${interval.time}" PowerLow="${interval.minValue}" PowerHigh="${interval.maxValue}"/>`;
      }
    }
  });
  return intervals;
}

function getWattPercentByFtp(watt) {
	return Number((watt/ftp).toFixed(2));
}

function calculateIntervalTime(index) {
  if (result.length > 0) {
    return ((time[index+1] || time[index]) / 1000) - getTotalWorkoutTime();
  }
  return time[index+1] / 1000;
}

function calculateAverageRampPower(minValue, maxValue) {
  return Number(((minValue + maxValue) / 2).toFixed(2));
}

function setIntervalInitialValue(newValue) {
  intervalInitialValue = newValue;
}

function downloadZwoFile() {
  const xmlText =
    `<workout_file>
      <author>F. Bouillon</author>
      <name>${getWorkoutName()}</name>
      <description></description>
      <tags></tags>
      <workout>
        ${getResultIntervals()}
      </workout>
    </workout_file>`;

  const filename = `${getWorkoutName()}.zwo`;
  const pom = document.createElement('a');
  const bb = new Blob([xmlText], {type: 'text/plain'});

  pom.setAttribute('href', window.URL.createObjectURL(bb));
  pom.setAttribute('download', filename);

  pom.dataset.downloadurl = ['text/plain', pom.download, pom.href].join(':');
  pom.draggable = true;
  pom.classList.add('dragout');

  pom.click();
}

for (let i = 0; i < target.length; i++) {
	if (target[i-1] !== undefined && target[i-2] !== undefined) {

  	// set steady interval
    if (target[i-1] === target[i] && target[i] !== target[i+1]) {
      result.push({
      	state: 'steady',
        value: getWattPercentByFtp(target[i]),
        time: calculateIntervalTime(i),
        index: i
      });
      setIntervalInitialValue(target[i+1]);
    }

		// set ramp interval (cooldown)
    if (target[i-2] > target[i-1] &&
        target[i-1] > target[i] &&
        (target[i] === target[i+1] || target[i+1] === undefined || target[i] < target[i+1] || (getWattPercentByFtp(target[i-1]) - getWattPercentByFtp(target[i])) > 0.20 )) {
    	const minValue = getWattPercentByFtp(Math.ceil(intervalInitialValue));
      const maxValue = getWattPercentByFtp(Math.round(target[i-1]));
      const time = calculateIntervalTime(i);
    	if (target[i+1] === undefined) {
      	result.push({
          state: 'ramp',
          type: 'cooldown',
          minValue,
          maxValue,
          time,
        });
      } else {
      	const average = calculateAverageRampPower(minValue, maxValue);
      	result.push({
          state: 'steady',
          type: 'cooldown',
          value: average,
          time,
          index: i,
        });
      }
      setIntervalInitialValue(target[i+1]);
    }

    // set ramp interval (warmup)
    if (target[i-2] < target[i-1] && target[i-1] < target[i] && (target[i] === target[i+1] || target[i+1] === undefined || target[i] > target[i+1])) {
      const minValue = getWattPercentByFtp(Math.ceil(intervalInitialValue));
      const maxValue = getWattPercentByFtp(Math.round(target[i-1]));
      const time = calculateIntervalTime(i);
    	if (result.length === 0) {
      	result.push({
          state: 'ramp',
          type: 'warmup',
          minValue,
          maxValue,
          time,
        });
      } else {
      	const average = calculateAverageRampPower(minValue, maxValue);
      	result.push({
          state: 'steady',
          type: 'warmup',
          value: average,
          time,
          index: i,
        });
      }
      setIntervalInitialValue(target[i+1]);
    }
  }
}

console.log(result);
console.log('Total time:', `${time[time.length-1]/1000} (${Math.ceil((time[time.length-1]/1000)/60)})`);
console.log('Total workout time:', `${getTotalWorkoutTime()} (${Math.ceil(getTotalWorkoutTime()/60)})`);

downloadZwoFile();