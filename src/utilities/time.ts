export function time(time: number, unit: string) {
  switch (unit) {
    default:
    case 'ms':
      return time;
    case 'seconds':
      return time * 1000;
    case 'minutes':
      return time * 60000;
    case 'hours':
      return time * 3600000;
    case 'days':
      return time * 86400000;
  }
}
