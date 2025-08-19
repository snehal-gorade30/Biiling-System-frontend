export const getDisplayText = (textObj, language) => {
  if (language === 'bilingual') {
    return `${textObj.marathi} / ${textObj.english}`;
  } else if (language === 'english') {
    return textObj.english;
  }
  return textObj.english; // fallback
};
