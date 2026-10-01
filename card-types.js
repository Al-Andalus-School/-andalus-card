/* =====================================================================
   أنواع البطاقات — لإضافة نوع جديد: انسخ أحد الكائنين وعدّل الحقول
   fields: تعريف الحقول | rows: ترتيب الصفوف في البطاقة (حقل أو حقلان)
   signatures: التوقيعات (from: يؤخذ الاسم من حقل | fixed: من SCHOOL_CONFIG)
   ===================================================================== */

const F = {
  domain: { label: 'المجال', type: 'text', options: LISTS.domains, group: 'المعلومات الأساسية', required: true, max: 80, ph: 'اختر المجال أو اكتبه' },
  semester: { label: 'الفصل الدراسي', type: 'select', options: LISTS.semesters, group: 'المعلومات الأساسية', required: true },
  grade: { label: 'الصف', type: 'select', options: LISTS.grades, group: 'المعلومات الأساسية', required: true },
  teacher: { label: 'المعلم المنفذ', type: 'text', group: 'المعلومات الأساسية', required: true, max: 60, ph: 'اسم المعلم المنفذ' },
  start: { label: 'بداية التنفيذ', type: 'date', group: 'مدة التنفيذ' },
  end: { label: 'نهاية التنفيذ', type: 'date', group: 'مدة التنفيذ' }
};

const CARD_TYPES = {
  program: {
    title: 'بطاقة تنفيذ برنامج نشاط طلابي',
    short: 'بطاقة تنفيذ برنامج',
    desc: 'توثيق تنفيذ برنامج النشاط الطلابي وعدد المشاركين وأيقونة التنفيذ في منصة مدرستي.',
    icon: 'M4 5h16v14H4zM8 9h8M8 13h5',
    titleField: 'name',
    rowHeight: 50,
    fields: {
      name: { label: 'اسم البرنامج', type: 'text', group: 'المعلومات الأساسية', required: true, max: 120, ph: 'اكتب اسم البرنامج' },
      domain: F.domain,
      sessions: { label: 'عدد حصص البرنامج', type: 'number', group: 'المعلومات الأساسية' },
      semester: F.semester, start: F.start, end: F.end, grade: F.grade, teacher: F.teacher,
      students: { label: 'عدد الطلبة المشاركين', type: 'number', group: 'أعداد المشاركين' },
      disabled: { label: 'عدد الطلبة المشاركين من ذوي الإعاقة', type: 'number', group: 'أعداد المشاركين' },
      parents: { label: 'عدد أولياء الأمور المشاركين في البرنامج', type: 'number', group: 'أعداد المشاركين' },
      icons: { label: 'عند تنفيذ المشاركة عبر منصة مدرستي: ما هي أيقونة التنفيذ؟', type: 'checks', options: LISTS.madrasatiIcons, group: 'منصة مدرستي' }
    },
    rows: [['name'], ['domain'], ['sessions'], ['semester'], ['start'], ['end'], ['grade'], ['teacher'], ['students'], ['disabled'], ['parents'], ['icons']],
    signatures: [{ role: 'المعلم المنفذ', from: 'teacher' }, { role: 'رائد النشاط', fixed: 'activityLeader' }]
  },

  contest: {
    title: 'بطاقة تنفيذ مسابقة نشاط طلابي',
    short: 'بطاقة تنفيذ مسابقة',
    desc: 'توثيق تنفيذ مسابقة النشاط الطلابي والفائزين والمتأهلين ونواتج المسابقة.',
    icon: 'M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 20h8M4 5h4M16 5h4',
    titleField: 'name',
    rowHeight: 42,
    fields: {
      name: { label: 'اسم المسابقة', type: 'text', group: 'المعلومات الأساسية', required: true, max: 120, ph: 'اكتب اسم المسابقة' },
      domain: F.domain,
      sessions: { label: 'عدد الحصص للإعداد والتأهيل للمسابقة', type: 'number', group: 'المعلومات الأساسية' },
      semester: F.semester, start: F.start, end: F.end, grade: F.grade, teacher: F.teacher,
      students: { label: 'عدد الطلبة المشاركين في المسابقة', type: 'number', group: 'أعداد المشاركين' },
      winners: { label: 'عدد الفائزين', type: 'number', group: 'أعداد المشاركين' },
      qualified: { label: 'عدد الطلبة المتأهلين للمرحلة المقبلة', type: 'number', group: 'أعداد المشاركين' },
      awards: { label: 'عدد الجوائز', type: 'number', group: 'أعداد المشاركين' },
      parents: { label: 'عدد أولياء الأمور المشاركين في المسابقة', type: 'number', group: 'أعداد المشاركين' },
      disabled: { label: 'عدد الطلبة المشاركين من ذوي الإعاقة', type: 'number', group: 'أعداد المشاركين' },
      outcomes: { label: 'نواتج المسابقة', type: 'textarea', group: 'نواتج المسابقة', max: 700, ph: 'اكتب نواتج المسابقة' }
    },
    rows: [['name'], ['domain'], ['sessions'], ['semester'], ['start'], ['end'], ['grade'], ['teacher'],
      ['students', 'winners'], ['qualified', 'awards'], ['parents', 'disabled'], ['outcomes']],
    signatures: [{ role: 'المعلم المنفذ', from: 'teacher' }, { role: 'رائد النشاط', fixed: 'activityLeader' }, { role: 'مدير المدرسة', fixed: 'principal' }]
  }
};
