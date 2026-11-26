/* Prototype data for the VGen dashboard.
   "Today" is pinned to Oct 9, 2025 so the deadline countdowns match the Figma design. */
window.VGEN = (function () {
  const TODAY = new Date(2025, 9, 9);

  const STATUSES = [
    { id: 'new', label: 'NEW' },
    { id: 'ready', label: 'Ready' },
    { id: 'wip', label: 'WIP' },
    { id: 'completed', label: 'Completed' },
  ];

  const PAYMENTS = [
    { id: 'unpaid', label: 'Not Paid', badge: 'Unpaid' },
    { id: 'partial', label: 'Partially Paid', badge: 'Partial' },
    { id: 'paid', label: 'Paid', badge: 'Paid' },
    { id: 'tbd', label: 'TBD', badge: 'TBD' },
  ];

  const TAGS = ['Branding', 'Emotes', 'Full Body', 'Graphics', 'Icons', 'Illustration', 'Live2D', 'Portrait'];

  const SERVICES = ['Emote', 'Character Design', 'Illustration', 'VTuber Model', 'VTuber Rigging', 'Logo', 'Icon Set', 'Banner'];

  // deadlineType drives the colored bar in Upcoming Deadlines: delivery | progress | payment
  const commissions = [
    { id: 'logo-design', title: 'Logo Design', client: 'Sarah Miller', email: 'sarah@example.com', price: 200, tag: 'Branding', payment: 'unpaid', status: 'new', due: '2025-10-12', deadlineType: 'payment', service: 'Logo' },
    { id: 'vtuber-rigging', title: 'VTuber Rigging', client: 'Alex Chen', email: 'alex@example.com', price: 123, tag: 'Branding', payment: 'unpaid', status: 'new', due: '2025-10-13', deadlineType: 'progress', service: 'VTuber Rigging' },
    { id: 'character-design', title: 'Character Design', client: 'Alex Chen', email: 'alex@example.com', price: 450, tag: 'Full Body', payment: 'unpaid', status: 'new', due: '2025-10-15', deadlineType: 'payment', service: 'Character Design' },
    { id: 'emote-pack', title: 'Emote Pack', client: 'Mike Johnson', email: 'mikeJohnson@example.com', price: 180, tag: 'Emotes', payment: 'partial', status: 'ready', due: '2025-10-14', deadlineType: 'delivery', service: 'Emote',
      description: 'Full body VTuber character design with multiple expressions and rigging for Live2D. Character is a cyberpunk-themed cat girl with neon accents.' },
    { id: 'portrait-commission', title: 'Portrait Commission', client: 'Emma Davis', email: 'emma@example.com', price: 320, tag: 'Portrait', payment: 'paid', status: 'ready', due: '2025-10-18', deadlineType: 'delivery', service: 'Illustration' },
    { id: 'comic-page', title: 'Comic Page', client: 'Taylor Brown', email: 'taylor@example.com', price: 400, tag: 'Illustration', payment: 'unpaid', status: 'wip', due: '2025-10-20', deadlineType: 'progress', service: 'Illustration' },
    { id: 'character-sheet', title: 'Character Sheet', client: 'Robin White', email: 'robin@example.com', price: 550, tag: 'Icons', payment: 'partial', status: 'wip', due: '2025-10-22', deadlineType: 'delivery', service: 'Character Design' },
    { id: 'vtuber-model', title: 'VTuber Model', client: 'Jordan Lee', email: 'jordan@example.com', price: 850, tag: 'Live2D', payment: 'unpaid', status: 'wip', due: '2025-10-25', deadlineType: 'progress', service: 'VTuber Model' },
    { id: 'icon-set', title: 'Icon Set', client: 'Casey Martinez', email: 'casey@example.com', price: 280, tag: 'Icons', payment: 'partial', status: 'completed', due: '2025-10-05', deadlineType: 'payment', service: 'Icon Set' },
    { id: 'banner-design', title: 'Banner Design', client: 'Sam Wilson', email: 'sam@example.com', price: 150, tag: 'Graphics', payment: 'paid', status: 'completed', due: '2025-10-08', deadlineType: 'payment', service: 'Banner' },
  ];

  // Calendar markers (match the dots in the Figma calendar)
  const events = [
    { date: '2025-10-09', type: 'payment', id: 'banner-design' },
    { date: '2025-10-12', type: 'progress', id: 'logo-design' },
    { date: '2025-10-15', type: 'progress', id: 'comic-page' },
    { date: '2025-10-15', type: 'delivery', id: 'character-design' },
    { date: '2025-10-20', type: 'progress', id: 'vtuber-model' },
    { date: '2025-10-22', type: 'delivery', id: 'character-sheet' },
    { date: '2025-10-22', type: 'payment', id: 'character-sheet' },
    { date: '2025-10-31', type: 'payment', id: 'vtuber-model' },
  ];

  // Monthly earnings (This Month card chart)
  const earnings = {
    2024: [1650, 1900, 2200, 2050, 1400, 750, 3150, 3950, 4800, 3503, 0, 0],
    2025: [2100, 2400, 2650, 2300, 2900, 2750, 3300, 3600, 3900, 3503, 0, 0],
  };

  const summary = {
    thisMonth: 3503,
    change: '+23.1%',
    pending: 3033,
    pendingCount: 8,
    pendingSplit: { unpaid: 1413, partial: 1620 },
  };

  return { TODAY, STATUSES, PAYMENTS, TAGS, SERVICES, commissions, events, earnings, summary };
})();
