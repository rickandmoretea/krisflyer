import React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";

const InfoAccordion = () => (
  <Accordion type="single" collapsible className="w-full mt-4">
    <AccordionItem value="how-to-read">
      <AccordionTrigger>How to read this</AccordionTrigger>
      <AccordionContent>
        <ul className="list-disc pl-5 text-sm space-y-1 text-zinc-700">
          <li><b>Monthly limits</b> exist for high earn rates—after that, you earn fewer miles per THB spent.</li>
          <li><b>SQ/Scoot/KrisShop</b> means spending with the Singapore Airlines group (tickets, in-flight shopping, KrisShop purchases).</li>
          <li><b>Duty Free/FX</b> refers to spending in foreign currencies or at duty-free retailers abroad.</li>
          <li><b>Other</b> is most remaining local/THB transactions and earns miles at the slowest rate.</li>
          <li>Tips: Stay inside the monthly limit, avoid excluded MCCs, and redeem miles in under 3 years.</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="rules">
      <AccordionTrigger>Category rules & exclusions</AccordionTrigger>
      <AccordionContent>
        <ul className="list-disc pl-5 text-sm space-y-1 text-zinc-700">
          <li><b>SQ/Scoot/KrisShop earning rates:</b> World Elite — Earn 1 mile per THB 12.5 (monthly limit: 200k THB), World — Earn 1 mile per THB 15 (limit: 100k THB).</li>
          <li><b>Duty Free/FX:</b> Earn 1 mile per THB 15 (limit: 200k for Elite, 50k for World).</li>
          <li><b>All other local:</b> Earn 1 mile per THB 20, no cap.</li>
          <li><b>Annual bonus (Elite):</b> +25,000 miles after 1M THB/year, posts after card renewal.</li>
          <li className="text-yellow-700">Excluded: groceries (MCC 5411), fuel, utilities, e-wallets, Makro, THB spent at overseas merchants, tax refunds, interest, fees.</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export default InfoAccordion;
