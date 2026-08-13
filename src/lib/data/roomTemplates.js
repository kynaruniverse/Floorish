// Room templates for quick adding
// Dimensions in metres

export const roomTemplates = [
  {
    type: 'living',
    label: 'Living Room',
    width: 4,
    depth: 5,
    color: '#E8F3E0',
    floorType: 'wood'
  },
  {
    type: 'kitchen',
    label: 'Kitchen',
    width: 3,
    depth: 3.5,
    color: '#FFF3E0',
    floorType: 'tile'
  },
  {
    type: 'bedroom',
    label: 'Bedroom',
    width: 3,
    depth: 4,
    color: '#D5E0E8',
    floorType: 'carpet'
  },
  {
    type: 'bathroom',
    label: 'Bathroom',
    width: 2,
    depth: 2.5,
    color: '#CCE0FF',
    floorType: 'tile'
  },
  {
    type: 'dining',
    label: 'Dining Room',
    width: 3,
    depth: 3.5,
    color: '#FFE0CC',
    floorType: 'wood'
  },
  {
    type: 'hallway',
    label: 'Hallway',
    width: 1.5,
    depth: 3,
    color: '#F0EBE1',
    floorType: 'wood'
  },
  {
    type: 'office',
    label: 'Office',
    width: 2.5,
    depth: 3,
    color: '#E8E0D5',
    floorType: 'carpet'
  },
  {
    type: 'garage',
    label: 'Garage',
    width: 4,
    depth: 6,
    color: '#E0E0E0',
    floorType: 'concrete'
  },
  {
    type: 'custom',
    label: 'Custom Room',
    width: 3,
    depth: 3,
    color: '#E8F3E0',
    floorType: 'wood'
  }
];

export function getTemplate(type) {
  return roomTemplates.find(t => t.type === type) || roomTemplates[roomTemplates.length - 1];
}