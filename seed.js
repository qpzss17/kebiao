/* 预设课表：手机首次打开、或在「管理 → 数据 → 载入预设课表」时会读这里。
   改这个文件就能批量改课表，不用在手机上一条条录。

   semester：学期信息
     name  学期名
     start 第 1 周的周一日期（周次由它推算）
     weeks 教学总周数
     days  每周上课天数：5=周一~周五，6=含周六，7=含周日
     periods 第 1~N 节的上课时间，格式 '开始-结束'

   courses：每门课一行
     name 课名  teacher 教师  loc 教室
     day  1~7（周一~周日）
     start/end 第几节到第几节（对应 periods 里的第几条）
     wl   上课周次，支持不连续写法：'1-16'、'3,6-9'、'5-7单,8-16'
     color  取 #3b5bdb #0d9488 #d97706 #db2777 #7c3aed #16a34a #e11d48 #0f766e
*/
window.SEED = {
  semester: {
    name: '2026—2027 第1学期',
    start: '2026-08-31',
    weeks: 20,
    days: 7,
    periods: ['08:20-09:00', '09:05-09:45', '10:05-10:45', '10:50-11:30', '11:35-12:15',
      '14:30-15:10', '15:15-15:55', '16:15-16:55', '17:00-17:40',
      '19:30-20:10', '20:15-20:55', '21:00-21:40'],
  },
  courses: [
    /* ---------- 周一 ---------- */
    { name: '大学生安全教育', teacher: '韦金梅', loc: 'T3-C510', day: 1, start: 1, end: 2, wl: '4,15', color: '#16a34a' },
    { name: '形势与政策', teacher: '张思琪', loc: 'T3-D301', day: 1, start: 1, end: 2, wl: '11', color: '#e11d48' },
    { name: '大学体育', teacher: '陆高峰', loc: '悦动运动场篮球场1', day: 1, start: 3, end: 4, wl: '4-5,7-14', color: '#d97706' },
    { name: '大学生心理健康教育', teacher: '安华平', loc: 'T1-D202', day: 1, start: 3, end: 4, wl: '16', color: '#16a34a' },
    { name: '机械制图', teacher: '蓝雄', loc: 'T3-C516', day: 1, start: 6, end: 8, wl: '4-5', color: '#7c3aed' },
    { name: '信息技术', teacher: '覃家运', loc: 'T1-A503', day: 1, start: 6, end: 9, wl: '7-10', color: '#0f766e' },
    { name: '信息技术', teacher: '覃家运', loc: 'T1-A504', day: 1, start: 6, end: 9, wl: '13-14', color: '#0f766e' },
    { name: '形势与政策', teacher: '张思琪', loc: 'T3-D302', day: 1, start: 6, end: 7, wl: '15-16', color: '#e11d48' },
    { name: '劳动教育—工业·匠心', teacher: '覃峰', loc: 'T7实训基地3#401-1', day: 1, start: 6, end: 9, wl: '11-12', color: '#db2777' },
    { name: '军事理论', teacher: '钟舒娴', loc: 'T1-C503', day: 1, start: 6, end: 8, wl: '18', color: '#d97706' },
    { name: '军事理论', teacher: '韦金梅', loc: 'T3-D302', day: 1, start: 9, end: 11, wl: '18', color: '#d97706' },
    { name: '高等数学', teacher: '王丽', loc: 'T4-A405', day: 1, start: 10, end: 12, wl: '4', color: '#3b5bdb' },

    /* ---------- 周二 ---------- */
    { name: '高等数学', teacher: '王丽', loc: 'T4-D202', day: 2, start: 3, end: 4, wl: '4,7-16', color: '#3b5bdb' },
    { name: '大学英语', teacher: '王金生', loc: 'T1-D401', day: 2, start: 6, end: 7, wl: '4-5,7-10,13-15', color: '#0d9488' },
    { name: '大学体育', teacher: '陆高峰', loc: '悦动运动场篮球场2', day: 2, start: 6, end: 7, wl: '16', color: '#d97706' },
    { name: '劳动教育—工业·匠心', teacher: '覃峰', loc: 'T7实训基地3#401-1', day: 2, start: 6, end: 9, wl: '11-12', color: '#db2777' },
    { name: '军事理论', teacher: '钟舒娴', loc: 'T1-C503', day: 2, start: 6, end: 8, wl: '18', color: '#d97706' },
    { name: '军事理论', teacher: '韦金梅', loc: 'T3-D302', day: 2, start: 9, end: 11, wl: '18', color: '#d97706' },
    { name: '机械制图', teacher: '蓝雄', loc: 'T1-C406', day: 2, start: 10, end: 12, wl: '7-8', color: '#7c3aed' },
    { name: '机械制图', teacher: '蓝雄', loc: 'T3-C510', day: 2, start: 10, end: 12, wl: '9', color: '#7c3aed' },
    { name: '机械制图', teacher: '蓝雄', loc: 'T3-C516', day: 2, start: 10, end: 12, wl: '10', color: '#7c3aed' },

    /* ---------- 周三 ---------- */
    { name: '机械制图', teacher: '蓝雄', loc: 'T3-C516', day: 3, start: 3, end: 5, wl: '5-7单,8-16', color: '#7c3aed' },
    { name: '劳动教育—工业·匠心', teacher: '覃峰', loc: 'T7实训基地3#401-1', day: 3, start: 6, end: 9, wl: '11-12', color: '#db2777' },
    { name: '信息技术', teacher: '覃家运', loc: 'T1-A505', day: 3, start: 6, end: 9, wl: '16', color: '#0f766e' },
    { name: '军事理论', teacher: '钟舒娴', loc: 'T1-C503', day: 3, start: 6, end: 8, wl: '18', color: '#d97706' },
    { name: '军事理论', teacher: '韦金梅', loc: 'T3-D302', day: 3, start: 9, end: 11, wl: '18', color: '#d97706' },
    { name: '高等数学B', teacher: '王丽', loc: 'T1-A206-1', day: 3, start: 8, end: 9, wl: '4', color: '#3b5bdb' },
    { name: '高等数学B', teacher: '王丽', loc: 'T1-A502', day: 3, start: 8, end: 9, wl: '7-10', color: '#3b5bdb' },
    { name: '入学教育与专业入门', teacher: '韦金梅', loc: 'T3-C506', day: 3, start: 10, end: 12, wl: '14', color: '#16a34a' },

    /* ---------- 周四 ---------- */
    { name: '高等数学', teacher: '王丽', loc: 'T2-C219', day: 4, start: 3, end: 4, wl: '3-4,6-9', color: '#3b5bdb' },
    { name: '思想道德与法治', teacher: '郭星', loc: 'T4-D201', day: 4, start: 3, end: 4, wl: '10-12双,13', color: '#e11d48' },
    { name: '机械制图', teacher: '蓝雄', loc: 'T3-C516', day: 4, start: 3, end: 4, wl: '14-16', color: '#7c3aed' },
    { name: '信息技术', teacher: '覃家运', loc: 'T1-A505', day: 4, start: 6, end: 9, wl: '3-4,7-9', color: '#0f766e' },
    { name: '信息技术', teacher: '覃家运', loc: 'T1-A505-3', day: 4, start: 6, end: 9, wl: '6', color: '#0f766e' },
    { name: '信息技术', teacher: '覃家运', loc: 'T1-A504', day: 4, start: 6, end: 9, wl: '13-15', color: '#0f766e' },
    { name: '思想道德与法治', teacher: '郭星', loc: 'T4-D201', day: 4, start: 6, end: 7, wl: '16', color: '#e11d48' },
    { name: '劳动教育—工业·匠心', teacher: '覃峰', loc: 'T7实训基地3#401-1', day: 4, start: 6, end: 9, wl: '10', color: '#db2777' },
    { name: '劳动教育—工业·匠心', teacher: '覃峰', loc: 'T3-A501-1', day: 4, start: 6, end: 9, wl: '12', color: '#db2777' },
    { name: '军事理论', teacher: '钟舒娴', loc: 'T1-C503', day: 4, start: 6, end: 8, wl: '18', color: '#d97706' },
    { name: '军事理论', teacher: '韦金梅', loc: 'T3-D302', day: 4, start: 9, end: 11, wl: '18', color: '#d97706' },
    { name: '机械制图', teacher: '蓝雄', loc: 'T3-C514', day: 4, start: 10, end: 12, wl: '3-4,13', color: '#7c3aed' },

    /* ---------- 周五 ---------- */
    { name: '大学生心理健康教育', teacher: '安华平', loc: 'T3-D202', day: 5, start: 1, end: 2, wl: '3,6-9', color: '#16a34a' },
    { name: '大学英语', teacher: '王金生', loc: 'T3-D302', day: 5, start: 3, end: 4, wl: '3,6-10,12-16', color: '#0d9488' },

    /* ---------- 周六 ---------- */
    { name: '思想道德与法治', teacher: '郭星', loc: 'T4-D201', day: 6, start: 3, end: 4, wl: '3,6-16', color: '#e11d48' },
    { name: '军事理论', teacher: '钟舒娴', loc: 'T1-C503', day: 6, start: 6, end: 8, wl: '17-18', color: '#d97706' },
    { name: '军事理论', teacher: '韦金梅', loc: 'T3-D302', day: 6, start: 9, end: 11, wl: '17-18', color: '#d97706' },

    /* ---------- 周日 ---------- */
    { name: '军事理论', teacher: '钟舒娴', loc: 'T1-C503', day: 7, start: 6, end: 8, wl: '18', color: '#d97706' },
  ],
};
