@battlechain
Feature: BattleChain Exclusion

  # Tests that system contracts in the excludedFromBattlechain config array
  # do not display BattleChain/Safe Harbor UI elements.
  #
  # Unit tests in tests/composables/useIsBattlechainExcluded.spec.ts provide
  # full coverage for both excluded and non-excluded scenarios.

  Background:
    Given I am on main page

  @excludedContract
  Scenario: Excluded system contract should not show BattleChain UI elements
    Given I go to page "/address/0x0000000000000000000000000000000000008001"
    Then Element with "text" "Contract state" should not be visible
    And Element with "text" "Safe Harbor" should not be visible
