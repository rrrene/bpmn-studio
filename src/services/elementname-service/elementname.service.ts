export class ElementNameService {
  public getHumanReadableType(elementType: string): string {
    const elementTypeWithoutBPMN: string = elementType.replace('bpmn:', '');
    const humanReadableElementType: string = elementTypeWithoutBPMN.replace(/([A-Z])/g, ' $1').trim();

    return humanReadableElementType;
  }

  public getHumanReadableName(elementName: string): string {
    const elementNameIsEmpty: boolean = elementName === undefined || elementName === '';

    if (elementNameIsEmpty) {
      return '';
    }

    return `"${elementName}"`;
  }
}
