import type { Schema, Struct } from '@strapi/strapi';

export interface EventAuffuehrung extends Struct.ComponentSchema {
  collectionName: 'components_event_auffuehrungs';
  info: {
    displayName: 'Auffuehrung';
    icon: 'apps';
  };
  attributes: {
    Datum: Schema.Attribute.DateTime;
    Zusatzinfo: Schema.Attribute.String;
  };
}

export interface VorverkaufVorverkauf extends Struct.ComponentSchema {
  collectionName: 'components_vorverkauf_vorverkaufs';
  info: {
    displayName: 'Vorverkauf';
    icon: 'stack';
  };
  attributes: {
    Datum: Schema.Attribute.DateTime;
    Info: Schema.Attribute.Text;
    Ort: Schema.Attribute.String;
    TicketLink: Schema.Attribute.String;
    TicketsOnline: Schema.Attribute.Boolean;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'event.auffuehrung': EventAuffuehrung;
      'vorverkauf.vorverkauf': VorverkaufVorverkauf;
    }
  }
}
