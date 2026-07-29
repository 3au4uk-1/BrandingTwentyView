import { defineFrontComponent } from 'twenty-sdk/define';

import { OkleykaSalaryPage } from 'src/deals-board/salary/OkleykaSalaryPage';
import { OKLEYKA_SALARY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineFrontComponent({
  universalIdentifier: OKLEYKA_SALARY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'okleyka-salary',
  description: 'Выгрузка зарплаты оклейщиков (Плёнка · Наши)',
  component: OkleykaSalaryPage,
});
