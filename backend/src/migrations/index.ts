import * as migration_20260919_034612_initial_content_platform from './20260919_034612_initial_content_platform';
import * as migration_20260919_042202_beta3_feedback_maintenance from './20260919_042202_beta3_feedback_maintenance';
import * as migration_20260919_145935_beta13_source_learning from './20260919_145935_beta13_source_learning';
import * as migration_20260923_h02_question_titles from './20260923_h02_question_titles';
import * as migration_20260923_h04_indicator_figure from './20260923_h04_indicator_figure';
import * as migration_20261027_longform_story from './20261027_longform_story';

export const migrations = [
  {
    up: migration_20260919_034612_initial_content_platform.up,
    down: migration_20260919_034612_initial_content_platform.down,
    name: '20260919_034612_initial_content_platform',
  },
  {
    up: migration_20260919_042202_beta3_feedback_maintenance.up,
    down: migration_20260919_042202_beta3_feedback_maintenance.down,
    name: '20260919_042202_beta3_feedback_maintenance',
  },
  {
    up: migration_20260919_145935_beta13_source_learning.up,
    down: migration_20260919_145935_beta13_source_learning.down,
    name: '20260919_145935_beta13_source_learning'
  },
  {
    up: migration_20260923_h02_question_titles.up,
    down: migration_20260923_h02_question_titles.down,
    name: '20260923_h02_question_titles'
  },
  {
    up: migration_20260923_h04_indicator_figure.up,
    down: migration_20260923_h04_indicator_figure.down,
    name: '20260923_h04_indicator_figure'
  },
  {
    up: migration_20261027_longform_story.up,
    down: migration_20261027_longform_story.down,
    name: '20261027_longform_story'
  },
];
