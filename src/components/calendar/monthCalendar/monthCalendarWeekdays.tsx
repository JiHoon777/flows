// eslint-disable-next-line react-refresh/only-export-components

export const MonthCalendarWeekdays = () => {
  const DAYS: string[] = ['일', '월', '화', '수', '목', '금', '토']
  return (
    <div className="mb-2 grid grid-cols-7 gap-2">
      {DAYS.map((day) => (
        <div
          key={day}
          className="text-center text-xs font-medium text-gray-500"
        >
          {day}
        </div>
      ))}
    </div>
  )
}
