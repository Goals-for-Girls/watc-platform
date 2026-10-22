/**
 * We Are the Change project library — seed content.
 *
 * Source: goalsforgirls.org/change-projects (public page), October 2026.
 * Stories are taken from that page; one-line summaries are shortened from it.
 *
 * SDG tags were assigned for the prototype and are NOT yet confirmed by
 * Goals for Girls (sdgConfirmed: false). Confirm them before launch.
 *
 * Coordinates are approximate and city- or district-level only, by design:
 * the public map must never point to a school, home or exact meeting place.
 *
 * This file is the temporary content source. In the next phase these records
 * move into Sanity so staff can edit them; lib/content.ts is the only file
 * that reads this array, so the swap touches nothing else.
 */

export type CountryCode = "IN" | "ZA" | "US";

export interface Project {
  slug: string;
  title: string;
  /** Who led it, as the girls' team or organization is publicly named. */
  team: string;
  /** Adult mentors or supporters, where the public page names them. */
  support?: string;
  /** Display name for the place, city or district level. */
  place: string;
  country: CountryCode;
  lat: number;
  lon: number;
  sdg: number;
  sdgConfirmed: boolean;
  summary: string;
  story: string;
  outcome?: string;
}

export const projects: Project[] = [
  {
    slug: "recycle-for-football",
    title: "Recycle for Football",
    team: "Shining Stars FC girls",
    place: "Bangalore",
    country: "IN",
    lat: 12.97,
    lon: 77.59,
    sdg: 12,
    sdgConfirmed: false,
    summary: "Turned a plastic-waste problem into a recycling drive the whole neighborhood joined.",
    story:
      "The girls targeted plastic waste with a community recycling project that brought in their families, the whole soccer program and local shopkeepers.",
    outcome: "About 80,000 plastic bottles collected, and the project was featured in the local newspaper.",
  },
  {
    slug: "plasto-cool",
    title: "Plasto-Cool",
    team: "Girls in Hyderabad",
    support: "Synchrony Financial mentors",
    place: "Hyderabad",
    country: "IN",
    lat: 17.39,
    lon: 78.49,
    sdg: 12,
    sdgConfirmed: false,
    summary: "Built home ventilation units out of boards and used plastic bottles.",
    story:
      "The girls tackled two problems at once, plastic waste and poor ventilation in homes, by building homemade air ventilation units from boards and plastic bottles.",
  },
  {
    slug: "creating-a-new-girls-soccer-team",
    title: "Creating a New Girls Soccer Team",
    team: "Girls from the Hyderabad Leadership Summit",
    support: "Synchrony Financial mentors",
    place: "Hyderabad",
    country: "IN",
    lat: 17.39,
    lon: 78.49,
    sdg: 5,
    sdgConfirmed: false,
    summary: "Started their community's first girls soccer club.",
    story:
      "After the Hyderabad Leadership Summit, a group of girls with no soccer background set out to start a girls team where none existed.",
    outcome: "Their community's first girls soccer club.",
  },
  {
    slug: "safe-spaces-for-girls",
    title: "Safe Spaces for Girls",
    team: "CEQUIN girls",
    place: "New Delhi",
    country: "IN",
    lat: 28.61,
    lon: 77.21,
    sdg: 5,
    sdgConfirmed: false,
    summary: "Persuaded local leaders to set aside safe places for girls to play.",
    story:
      "The girls met with community and local government leaders to designate areas where girls could play sports safely.",
  },
  {
    slug: "clean-hasunpur",
    title: "Clean Hasunpur",
    team: "Foot & Boot girls",
    place: "New Delhi",
    country: "IN",
    lat: 28.61,
    lon: 77.21,
    sdg: 11,
    sdgConfirmed: false,
    summary: "Got trash bins installed and ran rallies to keep the neighborhood clean.",
    story:
      "The girls asked local leaders to install trash bins, then held rallies and stage shows about keeping the community clean.",
  },
  {
    slug: "march-against-domestic-violence",
    title: "March Against Domestic Violence",
    team: "CEQUIN girls",
    place: "New Delhi",
    country: "IN",
    lat: 28.61,
    lon: 77.21,
    sdg: 5,
    sdgConfirmed: false,
    summary: "Marched for gender equity and against domestic violence.",
    story: "The girls advocated for gender equity and spoke out against domestic violence in their community.",
  },
  {
    slug: "letter-writing-campaign-for-education",
    title: "Letter Writing Campaign for Education",
    team: "CEQUIN girls",
    place: "New Delhi",
    country: "IN",
    lat: 28.61,
    lon: 77.21,
    sdg: 4,
    sdgConfirmed: false,
    summary: "Wrote to parents asking them to keep girls in school.",
    story:
      "The girls wrote letters to parents in their area urging them to let girls finish secondary school instead of leaving early for domestic work, marriage or motherhood.",
  },
  {
    slug: "say-no-to-drugs",
    title: "Say No to Drugs",
    team: "YFC Rurka Kalan girls",
    place: "Punjab",
    country: "IN",
    lat: 31.13,
    lon: 75.77,
    sdg: 3,
    sdgConfirmed: false,
    summary: "Ran rallies, stage shows and school assemblies on the harm drugs do.",
    story:
      "The girls raised awareness of the effects of drug abuse through community rallies, stage shows and school assemblies.",
  },
  {
    slug: "fight-against-child-marriage",
    title: "Fight Against Child Marriage",
    team: "Udayan Sangha girls",
    place: "West Bengal",
    country: "IN",
    lat: 22.99,
    lon: 87.85,
    sdg: 5,
    sdgConfirmed: false,
    summary: "Made the case in their community for girls finishing school before marriage.",
    story:
      "The girls held community rallies and meetings to explain why girls should wait to marry until after they finish school.",
  },
  {
    slug: "planting-trees",
    title: "Planting Trees",
    team: "Girls from Andro Village",
    place: "Andro Village, Manipur",
    country: "IN",
    lat: 24.76,
    lon: 94.05,
    sdg: 15,
    sdgConfirmed: false,
    summary: "Planted trees to care for the land and draw visitors to the village.",
    story:
      "The girls planted trees and improved care for the local environment, with the aim of bringing more tourism to the village.",
  },
  {
    slug: "super-moms-club",
    title: "Super Moms Club",
    team: "Girls in Nagpur",
    place: "Nagpur",
    country: "IN",
    lat: 21.15,
    lon: 79.09,
    sdg: 5,
    sdgConfirmed: false,
    summary: "Built a support group for single mothers and helped one each month.",
    story:
      "The girls identified 12 single mothers, served one of them each month, and connected all 12 in a support group.",
    outcome: "12 single mothers connected in a support group.",
  },
  {
    slug: "mentoring-young-girls",
    title: "Mentoring Young Girls",
    team: "Girls from Yuwa",
    place: "Jharkhand",
    country: "IN",
    lat: 23.62,
    lon: 85.62,
    sdg: 5,
    sdgConfirmed: false,
    summary: "Became mentors and role models for girls at a primary school.",
    story:
      "The girls served as youth mentors at a primary school, giving younger girls positive female role models.",
  },
  {
    slug: "teaching-feminine-hygiene",
    title: "Teaching Feminine Hygiene",
    team: "OSCAR girls",
    place: "Ranchi",
    country: "IN",
    lat: 23.34,
    lon: 85.31,
    sdg: 3,
    sdgConfirmed: false,
    summary: "Taught their peers the hygiene facts no one had shared with them.",
    story: "The girls shared feminine hygiene information with peers who had never been taught it.",
  },
  {
    slug: "gender-equality-in-sports",
    title: "Gender Equality in Sports",
    team: "Greenside High School girls",
    place: "Johannesburg",
    country: "ZA",
    lat: -26.2,
    lon: 28.05,
    sdg: 5,
    sdgConfirmed: false,
    summary: "Won equal recognition for girls' sports at their school.",
    story:
      "The girls advocated to their school, the superintendent and the sports director for equal representation and recognition of girls' and boys' sports.",
    outcome: "Recognized as school leaders, they helped steer the school's sports programs toward gender equality.",
  },
  {
    slug: "feminine-hygiene-products-for-school-girls",
    title: "Feminine Hygiene Products for School Girls",
    team: "Girls from Alexandra Township",
    place: "Alexandra Township",
    country: "ZA",
    lat: -26.1,
    lon: 28.1,
    sdg: 5,
    sdgConfirmed: false,
    summary: "Collected pads so girls without them could stay in class.",
    story:
      "The girls collected pads from teachers, parents and community members and gave them to girls who had no access to them at school.",
  },
  {
    slug: "homeless-pets-project",
    title: "Homeless Pets Project",
    team: "Girls working with Street Dawg Crew",
    place: "Salt Lake City",
    country: "US",
    lat: 40.76,
    lon: -111.89,
    sdg: 11,
    sdgConfirmed: false,
    summary: "Brought food, clothing and company to homeless pet owners every Sunday.",
    story:
      "The girls collected pet food, pet supplies, blankets, jackets and clothing for homeless people and their pets, then met every Sunday at a downtown park to hand them out.",
  },
  {
    slug: "self-love-city",
    title: "Self Love City",
    team: "A group of girls in Utah",
    place: "Utah",
    country: "US",
    lat: 39.32,
    lon: -111.09,
    sdg: 3,
    sdgConfirmed: false,
    summary: "Started an online community that builds self-love through helping others.",
    story:
      "The girls formed an online community encouraging peers to build habits of self-love by serving and encouraging others.",
  },
  {
    slug: "kits-for-the-homeless",
    title: "Kits for the Homeless",
    team: "Girls in Salt Lake City",
    place: "Salt Lake City",
    country: "US",
    lat: 40.76,
    lon: -111.89,
    sdg: 1,
    sdgConfirmed: false,
    summary: "Raised money for and packed hygiene and care bags for people without homes.",
    story: "The girls fundraised for, then packaged, hygiene and care bags for people experiencing homelessness.",
  },
  {
    slug: "lighting-navajo-homes",
    title: "Lighting Navajo Homes",
    team: "Girls from San Juan County",
    place: "San Juan County, Utah",
    country: "US",
    lat: 37.6,
    lon: -109.8,
    sdg: 7,
    sdgConfirmed: false,
    summary: "Brought solar power and light to homes on the Navajo Reservation.",
    story:
      "Many families on the Navajo Reservation had no light or power. The girls equipped homes with solar panels, batteries and lights.",
  },
];
