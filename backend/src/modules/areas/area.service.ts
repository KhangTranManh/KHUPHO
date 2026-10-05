import { HOUSING_TYPES } from '../households/household.constants.js';
import { AreaModel } from './area.model.js';

/** Mọi địa bàn: thấp tầng trước, rồi theo tên. */
export async function listAreas() {
  const areas = await AreaModel.find().sort({ name: 1 });
  return areas.sort(
    (a, b) => HOUSING_TYPES.indexOf(a.housingType) - HOUSING_TYPES.indexOf(b.housingType),
  );
}
