export function calculateDebtPayoff(debts, extraPayment = 0, strategy = 'avalanche') {
  if (!debts || debts.length === 0) return { months: 0, totalInterest: 0 };

  const working = debts
    .filter(d => d.remaining_amount > 0)
    .map(d => ({
      ...d,
      balance: parseFloat(d.remaining_amount),
      monthlyRate: parseFloat(d.interest_rate) / 100 / 12,
      minPayment: parseFloat(d.minimum_payment),
    }));

  if (working.length === 0) return { months: 0, totalInterest: 0 };

  if (strategy === 'avalanche') {
    working.sort((a, b) => b.interest_rate - a.interest_rate);
  } else {
    working.sort((a, b) => a.balance - b.balance);
  }

  let months = 0;
  let totalInterest = 0;
  const MAX_MONTHS = 600;

  while (working.some(d => d.balance > 0.01) && months < MAX_MONTHS) {
    months++;
    let available = extraPayment;

    for (const d of working) {
      if (d.balance <= 0) continue;
      const interest = d.balance * d.monthlyRate;
      totalInterest += interest;
      d.balance += interest;
      const pay = Math.min(d.minPayment, d.balance);
      d.balance = Math.max(0, d.balance - pay);
      available -= pay;
    }

    if (available > 0) {
      for (const d of working) {
        if (d.balance <= 0) continue;
        const pay = Math.min(available, d.balance);
        d.balance = Math.max(0, d.balance - pay);
        available -= pay;
        if (available <= 0) break;
      }
    }
  }

  return { months, totalInterest: Math.round(totalInterest * 100) / 100 };
}

export function calculateCompoundInterest(principal, monthlyContribution, annualRate, years) {
  const monthlyRate = parseFloat(annualRate) / 100 / 12;
  const totalMonths = Math.max(1, parseInt(years)) * 12;
  const data = [];
  let balance = parseFloat(principal) || 0;
  let totalInvested = balance;

  data.push({ x: 0, value: Math.round(balance), invested: Math.round(totalInvested) });

  for (let i = 1; i <= totalMonths; i++) {
    balance = balance * (1 + monthlyRate) + parseFloat(monthlyContribution);
    totalInvested += parseFloat(monthlyContribution);
    if (i % 12 === 0) {
      data.push({
        x: i / 12,
        value: Math.round(balance),
        invested: Math.round(totalInvested),
      });
    }
  }

  return data;
}

export function calculateFIRE(annualExpenses, currentSavings, monthlyContribution, annualReturn) {
  const target = parseFloat(annualExpenses) * 25;
  const monthlyRate = parseFloat(annualReturn) / 100 / 12;
  let balance = parseFloat(currentSavings) || 0;
  let months = 0;
  const MAX_MONTHS = 600;

  if (balance >= target) {
    return { target, months: 0, years: 0, monthlyPassiveIncome: annualExpenses / 12 };
  }

  while (balance < target && months < MAX_MONTHS) {
    balance = balance * (1 + monthlyRate) + parseFloat(monthlyContribution);
    months++;
  }

  return {
    target: Math.round(target),
    months,
    years: Math.floor(months / 12),
    monthlyPassiveIncome: Math.round((target * 0.04) / 12),
  };
}

export function calculate502030(monthlyIncome) {
  const income = parseFloat(monthlyIncome) || 0;
  return {
    needs: Math.round(income * 0.5 * 100) / 100,
    wants: Math.round(income * 0.3 * 100) / 100,
    savings: Math.round(income * 0.2 * 100) / 100,
  };
}

export function calculateMonthlySavingsNeeded(targetAmount, currentAmount, deadlineDate) {
  if (!deadlineDate) return 0;
  const deadline = new Date(deadlineDate);
  const today = new Date();
  const monthsLeft = Math.max(
    1,
    (deadline.getFullYear() - today.getFullYear()) * 12 +
      (deadline.getMonth() - today.getMonth())
  );
  const remaining = Math.max(0, parseFloat(targetAmount) - parseFloat(currentAmount));
  return Math.ceil(remaining / monthsLeft);
}

export function calculateNetWorth(investments, savingsGoals, emergencyFund, debts) {
  const totalAssets =
    (investments || []).reduce((s, i) => s + parseFloat(i.current_value || 0), 0) +
    (savingsGoals || []).reduce((s, g) => s + parseFloat(g.current_amount || 0), 0) +
    parseFloat(emergencyFund?.current_amount || 0);

  const totalDebts = (debts || []).reduce((s, d) => s + parseFloat(d.remaining_amount || 0), 0);

  return { assets: Math.round(totalAssets), debts: Math.round(totalDebts), net: Math.round(totalAssets - totalDebts) };
}

export function calculateExtraPaymentImpact(debt, extraMonthly) {
  const balance = parseFloat(debt.remaining_amount);
  const monthlyRate = parseFloat(debt.interest_rate) / 100 / 12;
  const minPayment = parseFloat(debt.minimum_payment);

  const calcMonths = (extra) => {
    let b = balance;
    let months = 0;
    let interest = 0;
    const MAX = 600;
    while (b > 0.01 && months < MAX) {
      const i = b * monthlyRate;
      interest += i;
      b += i;
      b = Math.max(0, b - (minPayment + extra));
      months++;
    }
    return { months, interest: Math.round(interest) };
  };

  const base = calcMonths(0);
  const withExtra = calcMonths(extraMonthly);
  return {
    base,
    withExtra,
    savedMonths: base.months - withExtra.months,
    savedInterest: base.interest - withExtra.interest,
  };
}

export function calculateBudgetProgress(spent, limit) {
  if (!limit || limit === 0) return 0;
  return Math.min(1, spent / limit);
}
